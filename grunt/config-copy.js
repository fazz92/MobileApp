/*
 * Copy Configuration
 *
 * See all options: https://github.com/gruntjs/grunt-contrib-copy
 */
module.exports = function( grunt ) {

    grunt.config( 'copy', {
        dev: {
            src: [
                '**/.*',
                '**',
                '!.git',
                '!.DS_Store',
                '!docs/**',
                '!**/less/**',
                '!resources/**',
                '!package.json',
                '!Gruntfile.js',
                '!**/readme.md',
                '!**/css/config/**',
                '!**/node_modules/**'
            ],
            dest: '<%= buildPath.dev %>'
        },
        dist: {
            src: [
                '**/.*',
                '**',
                '!.git',
                '!.DS_Store',
                '!docs/**',
                '!**/less/**',
                '!resources/**',
                '!package.json',
                '!Gruntfile.js',
                '!**/readme.md',
                '!**/css/config/**',
                '!**/node_modules/**',
            ],
            dest: '<%= buildPath.dist %>'
        }
    });

    grunt.loadNpmTasks( 'grunt-contrib-copy' );
};