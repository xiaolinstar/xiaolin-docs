pipeline {
    agent any
    stages {
        stage('DB') {
            steps {
                withCredentials([sshUserPrivateKey(credentialsId: 'db-key', keyFileVariable: 'SSH_KEY')]) {
                    sh 'ssh -i <key-path> <target-host> "docker pull mysql:8 && docker rm -f db || true && docker run -d --name db mysql:8"'
                }
            }
        }
        stage('App') {
            steps {
                withCredentials([sshUserPrivateKey(credentialsId: 'app-key', keyFileVariable: 'SSH_KEY')]) {
                    sh 'ssh -i <key-path> <target-host> "docker pull your-registry/app:<version> && docker rm -f app || true && docker run -d --name app -e DB_URL=jdbc:mysql://db:3306/app your-registry/app:<version>"'
                }
            }
        }
        stage('Verify') {
            steps {
                // 将 APP_HEALTHCHECK_URL 配置为 Jenkins Agent 可访问的实际地址
                sh 'curl -fsS "${APP_HEALTHCHECK_URL}"'
            }
        }
    }
}
