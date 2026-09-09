import fs from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const yaml = require('js-yaml')
const matter = require('gray-matter')
const base = path.resolve('docs/sre/devops')
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'devops-check-'))
const counts = { articles: 0, yaml: 0, shell: 0, workflows: 0, overlays: 0 }
const failures = []
function run(command, args, label, input) {
  const result = spawnSync(command, args, { encoding: 'utf8', input })
  if (result.status !== 0) failures.push(`${label}: ${result.error?.message || result.stderr || result.stdout}`)
}
const files = ['intermediate', 'advanced'].flatMap(dir =>
  fs.readdirSync(path.join(base, dir)).filter(f => f.endsWith('.md')).map(f => path.join(base, dir, f)))
const haveActionlint = spawnSync('actionlint', ['-version']).status === 0
const actionConfig = path.join(temp, 'actionlint.yaml')
fs.writeFileSync(actionConfig, 'self-hosted-runner:\n  labels:\n    - delivery-lab\n')
try {
  const numbers = new Set()
  const config = fs.readFileSync('docs/.vitepress/config.mts', 'utf8')
  const index = fs.readFileSync(path.join(base, 'index.md'), 'utf8')
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8')
    const { data, content } = matter(text)
    for (const key of ['title', 'description', 'date', 'updated', 'category', 'tags']) {
      if (!data[key]) failures.push(`${file}: 缺少 ${key}`)
    }
    const number = String(data.title).match(/^\d+/)?.[0]
    if (!number || numbers.has(number)) failures.push(`${file}: 编号缺失或重复 ${number}`)
    numbers.add(number)
    if (number !== '00') {
      const route = '/sre/devops/' + path.relative(base, file).replace(/\.md$/, '')
      const sidebarLine = config.split('\n').find(line => line.includes('`' + route + '`'))
      if (!sidebarLine?.includes(`text: '${number}. `)) failures.push(`${file}: sidebar 编号不一致`)
      const relative = './' + path.relative(base, file)
      const indexLine = index.split('\n').find(line => line.includes('](' + relative + ')'))
      if (!indexLine?.includes(`[${number} ｜`)) failures.push(`${file}: index 编号不一致`)
    }
    counts.articles++
    for (const match of content.matchAll(/^```(\w*)\s*\n([\s\S]*?)^```\s*$/gm)) {
      const [, language, code] = match
      const line = text.slice(0, text.indexOf(match[0])).split('\n').length
      const label = `${path.relative(process.cwd(), file)}:${line}`
      if (language === 'yaml') {
        try {
          const docs = yaml.loadAll(code)
          counts.yaml++
          for (const doc of docs) {
            if (doc?.jobs && doc?.on && haveActionlint) {
              const workflow = path.join(temp, `workflow-${counts.workflows++}.yaml`)
              fs.writeFileSync(workflow, code)
              run('actionlint', ['-config-file', actionConfig, '-shellcheck=', '-pyflakes=', workflow], label)
            }
            if (doc?.kind === 'Application' && (!doc.spec?.source?.repoURL || !doc.spec?.destination?.server)) {
              failures.push(`${label}: Application 的 source / destination 层级不完整`)
            }
          }
        } catch (error) { failures.push(`${label}: ${error.message}`) }
      }
      if (['bash', 'shell'].includes(language)) {
        counts.shell++
        run('bash', ['-n'], label, code)
        for (const embedded of code.matchAll(/python3 - <<'([A-Z]+)'\n([\s\S]*?)\n\1/g)) {
          run('python3', ['-c', 'import sys; compile(sys.stdin.read(), "doc-example", "exec")'], label, embedded[2])
        }
      }
    }
  }

  // 实际执行文档内的纯文件生成器，并用 kubectl 做离线 Kustomize 渲染。
  const blocks = (file, lang) => [...fs.readFileSync(path.join(base, file), 'utf8')
    .matchAll(new RegExp('^```' + lang + '\\n([\\s\\S]*?)^```', 'gm'))].map(m => m[1])
  if (haveActionlint) {
    const workflow = yaml.load(blocks('intermediate/ci-pipeline.md', 'yaml')[0])
    const steps = workflow.jobs.build.steps
    const gate = yaml.load(blocks('advanced/quality-gate.md', 'yaml')[0])
    const sbom = yaml.load(blocks('advanced/sha-SBOM.md', 'yaml')[0])
    steps.splice(steps.findIndex(step => step.uses?.startsWith('docker/login-action')), 0, ...gate, ...sbom)
    const signing = yaml.load(blocks('advanced/sha-SBOM.md', 'yaml')[1])
    steps.splice(steps.findIndex(step => step.name === 'Push and record digest') + 1, 0, ...signing)
    workflow.jobs.build.permissions['id-token'] = 'write'
    const merged = path.join(temp, 'combined-ci.yaml')
    fs.writeFileSync(merged, yaml.dump(workflow))
    run('actionlint', ['-config-file', actionConfig, '-shellcheck=', '-pyflakes=', merged], '合并后的 CI + 门禁 + SBOM + 签名工作流')
    counts.workflows++
  }
  const lab = path.join(temp, 'lab')
  fs.mkdirSync(path.join(lab, 'k8s/base'), { recursive: true })
  for (const [i, name] of ['deployment.yaml', 'service.yaml', 'ingress.yaml'].entries()) {
    fs.writeFileSync(path.join(lab, 'k8s/base', name), blocks('intermediate/16-k8s-app-deploy.md', 'yaml')[i])
  }
  fs.writeFileSync(path.join(lab, 'k8s/base/configmap.yaml'), blocks('intermediate/17-configmap-secret.md', 'yaml')[0])
  fs.writeFileSync(path.join(lab, 'k8s/base/kustomization.yaml'), blocks('intermediate/18-env-separation.md', 'yaml')[0])
  const generator = blocks('intermediate/18-env-separation.md', 'bash').find(code => code.includes("python3 - <<'CODE'"))
    .split("python3 - <<'CODE'\n")[1].split('\nCODE')[0]
  const image = 'ghcr.io/example/delivery-demo@sha256:' + 'a'.repeat(64)
  const generated = spawnSync('python3', ['-c', generator], { cwd: lab, env: { ...process.env, IMAGE_REF: image }, encoding: 'utf8' })
  if (generated.status !== 0) failures.push(`overlay 生成失败: ${generated.stderr}`)
  for (const env of ['dev', 'staging', 'prod']) {
    const result = spawnSync('kubectl', ['kustomize', `k8s/overlays/${env}`], { cwd: lab, encoding: 'utf8' })
    if (result.status !== 0) { failures.push(`kubectl kustomize ${env}: ${result.error?.message || result.stderr}`); continue }
    const docs = yaml.loadAll(result.stdout)
    const deployment = docs.find(doc => doc.kind === 'Deployment')
    const ingress = docs.find(doc => doc.kind === 'Ingress')
    const configmap = docs.find(doc => doc.kind === 'ConfigMap')
    if (docs.some(doc => doc.metadata.namespace !== env) || deployment.spec.template.spec.containers[0].image !== image
      || ingress.spec.rules[0].host !== `${env}.demo.local` || configmap.data.APP_ENV !== env) {
      failures.push(`${env}: 渲染后的 namespace / image / host / APP_ENV 不匹配`)
    }
    counts.overlays++
  }
} finally { fs.rmSync(temp, { recursive: true, force: true }) }
console.log(JSON.stringify(counts))
if (!haveActionlint) console.log('未安装 actionlint，已跳过工作流语义检查。')
if (failures.length) { console.error(failures.join('\n')); process.exitCode = 1 }
