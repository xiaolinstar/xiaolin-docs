pipeline {
    agent any

    environment {
        // 定义环境变量，例如 Docker 镜像仓库的 URL
        DOCKER_REGISTRY = 'xxl1997/xiaolin-docs'
        VERSION = '0.0.1'
        CONTAINER_NAME = 'xiaolin-website'
    }

    stages {
        stage('Checkout') {
            steps {
                // 检出代码
                checkout scm
            }
        }

        stage('Test') {
            steps {
                sh 'echo 项目测试'
            }
        }
        stage('Cleanup') {
            steps {
                script {
                    // 停止容器
                    sh "docker stop ${CONTAINER_NAME} || true"
                    // 删除容器
                    sh "docker rm ${CONTAINER_NAME} || true"
                    // 删除docker镜像
                    sh "docker rmi ${DOCKER_REGISTRY}:${VERSION} || true"
                }
            }
        }

        stage('Build') {
            steps {
                // 构建 Docker 镜像
                sh "docker build -t ${DOCKER_REGISTRY}:${VERSION} ."
            }
        }

/*
        stage('Push Docker Image') {
            steps {
                // 推送 Docker 镜像到仓库
                sh 'echo 123456xxl | docker login -u xxl1997 --password-stdin'
                sh 'docker push ${DOCKER_REGISTRY}:${VERSION}'
            }
        }
*/
        stage('Deploy') {
            // https://www.jenkins.io/zh/doc/book/pipeline/jenkinsfile/
            when {
                expression {
                    currentBuild.result == null || currentBuild.result == 'SUCCESS'
                }
            }
            steps {
                // 部署到服务器
                sh "docker run -d --name ${CONTAINER_NAME} -p 443:8080 ${DOCKER_REGISTRY}:${VERSION}"
            }
        }
    }

    post {
        success {
            // 构建成功
            echo 'Build and deployment succeeded.'
        }
        failure {
            // 构建失败
            echo 'Build or deployment failed.'
        }
    }
}