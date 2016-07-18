/*
 * SVG Configuration
 *
 * See all options: https://github.com/filamentgroup/grunticon
 */
module.exports = function( grunt ) {

    var prop = grunt.option( 'property' );

    grunt.config('grunticon', {
        myIcons: {
            files: [{
                expand: true,
                cwd: 'library/images/' + prop +'/svg-min/', // Path to minimized SVG files
                src: ['*.svg'],
                dest: 'library/less/' + prop +'/global/icons/'
            }],
            options: {
                datasvgcss: 'svg.less',
                datapngcss: 'delete/png.less',
                urlpngcss: 'delete/ie8.less',
                previewhtml: 'delete/index.html',
                pngfolder: 'delete/png',
                loadersnippet: 'delete/loader.txt',
                template: 'grunt/config-grunticon-template.hbs',
                cssprefix: 'icon-'
            }
        }
    });

    grunt.loadNpmTasks('grunt-grunticon');
};