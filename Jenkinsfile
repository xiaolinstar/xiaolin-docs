pipeline {
    agent any

    environment {
        // 定义环境变量，例如 Docker 镜像仓库的 URL
        DOCKER_REGISTRY = 'xxl1997/xiaolin-docs'
        VERSION = '0.0.1'
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

        stage('Build Docker Image') {
            steps {
                // 构建 Docker 镜像
                sh 'docker build -t ${DOCKER_REGISTRY}:${VERSION} .'
            }
        }

        stage('Push Docker Image') {
            steps {
                // 推送 Docker 镜像到仓库
                sh 'docker login -u ${xxl1997} -p ${123456xxl}'
                sh 'docker push ${DOCKER_REGISTRY}:${VERSION}'
            }
        }

//         stage('Deploy') {
//             steps {
//                 // 部署到服务器
//                 sh 'ssh user@server "docker pull ${DOCKER_REGISTRY}/myapp:${env.BUILD_NUMBER} && docker stop myapp || true && docker rm myapp || true && docker run -d --name myapp ${DOCKER_REGISTRY}/myapp:${env.BUILD_NUMBER}'
//             }
//         }
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