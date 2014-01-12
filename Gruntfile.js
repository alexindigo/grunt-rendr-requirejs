/*
 * grunt-rendr-requirejs
 */

'use strict';

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    jshint: {
      all: [
        'Gruntfile.js',
        'tasks/*.js',
        '<%= nodeunit.tests %>',
      ],
      options: {
        jshintrc: '.jshintrc',
      },
    },

    // Before generating any new files, remove any previously-created files.
    clean: {
      tests: ['tmp'],
    },

    // Configuration to be run (and then tested).
    rendr_requirejs: {
      compile: {
        options: {
          appDir: 'test/fixtures/sample',
          mainConfigFile: 'test/fixtures/sample/common.js',
          dir: 'tmp/test/sample',
          node_modules:
          [
            {name: 'async', location: 'async/lib', main: 'async.js'},
            {name: 'underscore', location: 'underscore', main: 'underscore.js'}, // will be fetch from rendr dependency
            {name: 'backbone', location: 'backbone', main: 'backbone.js'} // will be fetch from rendr peerDependency
          ],
          modules: [
            {
              name: '../common',
              include:
              [
                'jquery',
                'async',
                'shared/module',
                'app/controller/Base',
                'app/model/Base'
              ],
            },
            {
                name: '../bundle',
                include: ['app/app'],
                exclude: ['../common']
            },
            {
                name: '../other-bundle',
                include: ['../other/foo'],
                exclude: ['../common']
            }
          ]
        }

      }
    },

    // Unit tests.
    nodeunit: {
      tests: ['test/*_test.js'],
    },

  });

  // Actually load this plugin's task(s).
  grunt.loadTasks('tasks');

  // These plugins provide necessary tasks.
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-nodeunit');

  // Whenever the "test" task is run, first clean the "tmp" dir, then run this
  // plugin's task(s), then test the result.
  grunt.registerTask('test', ['clean', 'rendr_requirejs', 'nodeunit']);

  // By default, lint and run all tests.
  grunt.registerTask('default', ['jshint', 'test']);
  grunt.registerTask('build', ['clean', 'rendr_requirejs']);

};
