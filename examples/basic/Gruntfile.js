module.exports = function(grunt) {
    grunt.loadNpmTasks('grunt-shell');
    grunt.initConfig({
        shell: {
            generate: {
                command: ["node ./certificates.js"].join("&&")
            }
        },
        
    })
    grunt.registerTask('default', ['shell:generate']);
}