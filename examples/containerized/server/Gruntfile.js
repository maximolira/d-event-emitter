const fs = require('fs');
module.exports = function(grunt) {
    var dir = './certificates';
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }
    grunt.loadNpmTasks('grunt-shell');
    grunt.initConfig({
        shell: {
            generate: {
                command: [
                    'openssl genrsa -passout pass:1111 -des3 -out certificates/ca.key 4096',
                    'openssl req -passin pass:1111 -new -x509 -days 365 -key certificates/ca.key -out certificates/ca.crt -subj  "/C=CL/ST=RM/L=Santiago/O=Test/OU=Test/CN=ca"',
                    'openssl genrsa -passout pass:1111 -des3 -out certificates/server.key 4096',
                    'openssl req -passin pass:1111 -new -key certificates/server.key -out certificates/server.csr -subj  "/C=CL/ST=RM/L=Santiago/O=Test/OU=Server/CN=localhost"',
                    'openssl x509 -req -passin pass:1111 -days 365 -in certificates/server.csr -CA certificates/ca.crt -CAkey certificates/ca.key -set_serial 01 -out certificates/server.crt',
                    'openssl rsa -passin pass:1111 -in certificates/server.key -out certificates/server.key',
                    'openssl genrsa -passout pass:1111 -des3 -out certificates/client.key 4096',
                    'openssl req -passin pass:1111 -new -key certificates/client.key -out certificates/client.csr -subj  "/C=CL/ST=RM/L=Santiago/O=Test/OU=Client/CN=localhost"',
                    'openssl x509 -passin pass:1111 -req -days 365 -in certificates/client.csr -CA certificates/ca.crt -CAkey certificates/ca.key -set_serial 01 -out certificates/client.crt',
                    'openssl rsa -passin pass:1111 -in certificates/client.key -out certificates/client.key'
                ].join("&&")
            }
        },
        
    })
    grunt.registerTask('default', ['shell:generate']);
}