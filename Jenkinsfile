node {
    // Checkout all submodules
    checkout([
        $class: 'GitSCM',
        branches: scm.branches,
        doGenerateSubmoduleConfigurations: true,
        extensions: scm.extensions + [[$class: 'SubmoduleOption', parentCredentials: true]],
        userRemoteConfigs: scm.userRemoteConfigs
    ])

    def repoHost = 'us-east4-docker.pkg.dev'
    def projectId = 'one-data-commons'
    def repoName = 'datacommons'
    def appName = 'website-compose'
    def gitCommit

    stage('Determine image tag') {
        gitCommit = sh(script: "git rev-parse --short=7 HEAD", returnStdout: true).trim()
    }

    stage('Authenticate docker for GCP access') {
        sh 'gcloud auth configure-docker us-east4-docker.pkg.dev'
    }

    stage('Build image') {
        sh """
            docker build \
              --tag ${repoHost}/${projectId}/${repoName}/${appName}:${gitCommit} \
              -f build/web_compose/Dockerfile .
        """
    }

    stage('Publish image') {
        sh "docker push ${repoHost}/${projectId}/${repoName}/${appName}:${gitCommit}"
    }
}
