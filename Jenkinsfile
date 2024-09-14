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
                sh 'echo HelloWorld'
            }
        }

        stage('Build Image') {
            steps {
                script {
                    def containerExists = sh(script: "docker ps -a --format '{{.Names}}' | grep -q ${CONTAINER_NAME}", returnStatus: true) == 0
                    def imageExists = sh(script: "docker images --format '{{.Repository}}:{{.Tag}}' | grep -q ${DOCKER_REGISTRY}:${VERSION}", returnStatus: true) == 0
                    if (containerExists) {
                        sh "docker stop ${CONTAINER_NAME}"
                        sh "docker rm ${CONTAINER_NAME}"
                    }
                    if (imageExists) {
                        sh "docker rmi ${DOCKER_REGISTRY}:${VERSION}"
                    }
                    // 构建 Docker 镜像
                    sh 'docker buildx -t ${DOCKER_REGISTRY}:${VERSION}.'
                }
            }
        }

//         stage('Push Docker Image') {
//             steps {
//                 // 推送 Docker 镜像到仓库
//                 sh 'docker login -u ${xxl1997} -p ${123456xxl}'
//                 sh 'docker push ${DOCKER_REGISTRY}:${VERSION}'
//             }
//         }

        stage('Deploy') {
            steps {
                // 部署到服务器
                sh "docker run -d --name ${CONTAINER_NAME} -p 80:8080 ${DOCKER_REGISTRY}:${VERSION}"
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