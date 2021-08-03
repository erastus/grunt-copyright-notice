'use strict';

module.exports = function(grunt) {

    // default test task
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'),
        notice: 
            '// =========================================================\n' +
            '// * <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("dd-mm-yyyy") %>\n' +
            '// =========================================================\n' +
            '//\n' +
            '// * Repository: <%= pkg.repository.url %>\n' +
            '// * Copyright © 2021 Erastus\n' +
            '//\n' +
            '// * Coded by <%= pkg.author %>\n' +
            '//\n' +
            '// =========================================================\n' +
            '//\n' +
            '// * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.',

        'copyright-notice': {
            options: {
                //
            },
            test: {
                options: {
                    notice: '<%= notice %>',
                    openTag: '<!--\n',
                    closeTag: '\n-->'

                },
                src: [
                    'dist/**/*.js',
                    'dist/**/*.css',
                    'dist/**/*.html'
                ]
            }
        },
        copy: {
            main: {
                expand: true,
                cwd: 'tests/src/',
                src: '**',
                dest: 'dist/'
            }
        },
        clean: {
            src: ['dist/']
        },
        nodeunit: {
            all: ['tests/tags.test.js']
        }
    });

    // Actually load this plugin's task(s).
    grunt.loadTasks('tasks');

    grunt.loadNpmTasks('grunt-contrib-copy');
    grunt.loadNpmTasks('grunt-contrib-clean');
    grunt.loadNpmTasks('grunt-contrib-nodeunit');

    // Test tasks cleans folder, runs tags task, then runs nodeunit
    grunt.registerTask('test', [
        'clean',
        'copy:main',
        'copyright-notice:test',
        'clean'
    ]);
};
