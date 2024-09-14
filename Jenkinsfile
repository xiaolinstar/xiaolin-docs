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

        stage('Build Docker Image') {
            steps {
                sh """
                // 停止并删除之前的容器，如果存在
                docker ps -a | grep ${CONTAINER_NAME} && docker stop ${CONTAINER_NAME} && docker rm ${CONTAINER_NAME}
                // 删除旧的Docker镜像
                docker ps -a | grep ${DOCKER_REGISTRY}:${VERSION} && docker rmi ${DOCKER_REGISTRY}:${VERSION}
                // 构建 Docker 镜像
                docker buildx -t ${DOCKER_REGISTRY}:${VERSION} .
                """
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
                sh 'docker run -d ${CONTAINER_NAME} -p 80:8080 --name ${DOCKER_REGISTRY}:${VERSION}'
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