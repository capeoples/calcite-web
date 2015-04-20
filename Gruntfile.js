// ┌─────────────┐
// │ Gruntfile   │
// └─────────────┘
// Grunt wraps several tasks to ease development
// runs middleman, deploys the site, and tags new releases

// Javascript banner
var banner = '/* <%= pkg.name %> - v<%= pkg.version %> - <%= grunt.template.today("yyyy-mm-dd") %>\n' +
                '*  <%= pkg.homepage %>\n' +
                '*  Copyright (c) <%= grunt.template.today("yyyy") %> Environmental Systems Research Institute, Inc.\n' +
                '*  Apache 2.0 License */\n';

var currentVersion = require('./package.json').version;

module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    // Running a development server
    'http-server': {
      'dev': {
        root: 'docs/build',
        port: 8888,
        host: '0.0.0.0',
        cache: 0,
        showDir : true,
        autoIndex: true,
        ext: 'html',
        runInBackground: true
      }
    },

    // Rebuild site with Acetate
    'acetate': {
      build: {
        config: 'docs/acetate.conf.js'
      }
    },

    // Watch files
    'watch': {
      scripts: {
        files: ['lib/js/calcite-web.js'],
        tasks: [
          'concat:doc',
          'copy:doc',
          'jshint'
        ]
      },
      images: {
        files: ['lib/img/**/*'],
        tasks: [
          'newer:imagemin:doc',
          'copy:doc'
        ]
      },
      icons: {
        files: ['lib/img/icons/**/*.svg'],
        tasks: [
          'shell:icons'
        ]
      },
      libsass: {
        files: ['lib/sass/**/*', 'docs/source/assets/css/**/*'],
        tasks: [
          'sass:doc',
          'copy:doc'
        ]
      },
      docs: {
        files: ['docs/source/**'],
        tasks: [
          'acetate:build'
        ]
      }
    },

    // Check Javascript for errors
    'jshint': {
      all: ['lib/js/calcite-web.js']
    },

    // Build CSS files from SASS
    'sass': {

      options: {
        includePaths: ['lib/sass/', 'node_modules/patterns-color/scss']
      },

      expanded: {
        src: 'lib/sass/calcite-web.scss',
        dest: 'dist/css/calcite-web.css'
      },

      doc: {
        expand: true,
        cwd: 'docs/source/assets/css',
        src: ['**/*.scss'],
        dest: 'docs/build/assets/css',
        ext: '.css'
      },

      homepage: {
        files: {
          'docs/build/assets/css/homepage.css': 'docs/source/assets/css/homepage.scss'
        }
      }
    },

    // Create minified version of build css
    'cssmin': {
      target: {
        files: {
          'dist/css/calcite-web.min.css': ['dist/css/calcite-web.css']
        }
      }
    },

    // Build minified Javascript file to dist
    'uglify': {
      options: {
        mangle: false,
        banner: banner
      },
      dist: {
        files: {
          'dist/js/calcite-web.min.js': ['lib/js/calcite-web.js']
        }
      }
    },

    // Copy libsass files to dist, doc assets to build
    'copy': {
      libsass: {
        expand: true,
        cwd: 'lib/',
        src: ['sass/**/*'],
        dest: 'dist/'
      },
      doc: {
        expand: true,
        cwd: 'docs/source/',
        src: ['assets/img/**/*', 'assets/js/**/*'],
        dest: 'docs/build/'
      }
    },

    // Copy Javascript to dist and doc
    'concat': {
      options: {
        banner: banner
      },
      dist: {
        files: {
          'dist/js/calcite-web.js': 'lib/js/calcite-web.js'
        }
      },
      doc: {
        files: {
          'docs/source/assets/js/libs/calcite-web.js': 'lib/js/calcite-web.js'
        }
      }
    },

    // Optimize images and icons for dist and doc
    'imagemin': {
      dist: {
        files: [{
          expand: true,
          cwd: 'lib/',
          src: ['img/**/*.{png,jpg,svg,ico}'],
          dest: 'dist/'
        }]
      },
      doc: {
        files: [{
          expand: true,
          cwd: 'lib/',
          src: ['img/**/*.{png,jpg,svg,ico}'],
          dest: 'docs/source/assets/'
        }]
      }
    },

    // Make a zip file of the dist folder
    'compress': {
      main: {
        options: {
          archive: 'calcite-web.zip'
        },
        files: [
          {
            src: ['dist/**'],
            dest: './'
          },
        ]
      }
    },

    // Upload dist folder to s3
    'aws_s3': {
      options: {
        region: 'us-west-1',
        bucket: 'patterns.esri.com',
        endpoint: 'https://s3-us-west-1.amazonaws.com',
        access: 'public-read',
        gzip: true
      },
      production: {
        files: [
          // Manually set content type (plugin was setting incorrectly).
          {expand: true, cwd: 'dist/', src: ['**/*.js'],  dest: 'files/calcite-web/' + currentVersion + '/', params: {ContentType: 'application/javascript'}},
          {expand: true, cwd: 'dist/', src: ['**/*.css'], dest: 'files/calcite-web/' + currentVersion + '/', params: {ContentType: 'text/css'}},
          {expand: true, cwd: 'dist/', src: ['**/*.svg'], dest: 'files/calcite-web/' + currentVersion + '/', params: {ContentType: 'image/svg+xml'}},
          {expand: true, cwd: 'dist/', src: ['**/*.ico'], dest: 'files/calcite-web/' + currentVersion + '/', params: {ContentType: 'image/x-icon'}},
          {expand: true, cwd: 'dist/', src: ['**/*.jpg'], dest: 'files/calcite-web/' + currentVersion + '/', params: {ContentType: 'image/jpg'}},
          {expand: true, cwd: 'dist/', src: ['**/*.json'],dest: 'files/calcite-web/' + currentVersion + '/', params: {ContentType: 'application/javascript'}},
          {expand: true, cwd: 'dist/', src: ['**/*.map'], dest: 'files/calcite-web/' + currentVersion + '/', params: {ContentType: 'application/javascript'}}
        ]
      }
    },

    // Ask for AWS ID and Key
    'prompt': {
      aws: {
        options: {
          questions: [
            {
              config: 'aws_s3.options.accessKeyId',
              type: 'input',
              message: 'AWS Access ID:'
            },
            {
              config: 'aws_s3.options.secretAccessKey',
              type: 'input',
              message: 'AWS Secret Access Key:'
            }
          ]
        }
      }
    },

    // bin scripts
    'shell': {
      guid: {
        command: 'bin/guid.js',    // Generate a unique id for a new section
      },
      deploy: {
        command: 'bin/deploy.js',  // Create a JSON record of current documentation
      },
      release: {
        command: 'bin/release.sh'  // Create GitHub release that includes dist
      },
      icons: {
        command: 'bin/icons.js'    // Create a sass file with all icons from icon folder
      }
    },

    // Deploy doc site to gh-pages
    'gh-pages': {
      options: {
        base: 'docs/build',
        repo: 'https://github.com/Esri/calcite-web.git'
      },
      src: ['**']
    },

    // Runs tasks concurrently, speeding up Grunt
    'concurrent': {
      prepublish: [
        'scss',
        'uglify',
        'copy',
        'concat:dist',
        'newer:imagemin:dist'
      ]
    }

  });

  // load all grunt modules
  require('matchdep').filterDev('grunt-*').forEach(grunt.loadNpmTasks);

  // ┌─────────────┐
  // │ Grunt tasks │
  // └─────────────┘

  // Build sass
  grunt.registerTask('scss', [
    'sass',
    'cssmin'
  ]);

  // Run a development environment
  grunt.registerTask('dev', [
    'acetate:build',
    'newer:imagemin:doc',
    'concat:doc',
    'sass:doc',
    'copy:doc',
    'http-server',
    'watch'
  ]);

  // Test calcite-web.js
  grunt.registerTask('test', [
    'jshint'
  ]);

  // Build a dist folder with all assets
  grunt.registerTask('prepublish', [
    'shell:icons',
    'concurrent:prepublish'
  ]);

  // Upload files to s3
  grunt.registerTask('s3', [
    'prompt:aws',
    'aws_s3'
  ]);

  // Build and deploy doc site to github pages
  grunt.registerTask('deploy', 'Deploy documentation to github pages', function(n) {
    if (grunt.option('message')) {
      grunt.config.set('gh-pages.options.message', grunt.option('message'));
    }
    grunt.task.run([
      'acetate:build',
      'newer:imagemin:doc',
      'concat:doc',
      'sass:doc',
      'copy:doc',
      'shell:deploy',
      'gh-pages'
    ]);
  });

  // Release a new version of the framework
  grunt.registerTask('release', [
    'prepublish',
    'shell:deploy',
    'compress',
    'shell:release',
    's3'
  ]);

  // Default task starts up a dev environment
  grunt.registerTask('default', ['prepublish', 'dev']);

};
