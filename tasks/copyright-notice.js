/*
 * grunt-copyright-notice
 * https://github.com/erastus/grunt-copyright-notice
 *
 * Copyright © 2021 Erastus
 * Licensed under the BSB license.
 */

'use strict';

module.exports = function (grunt) {
    var path = require('path');
    var os = require('os');
    var EOL = os.EOL; // end of line for operating system
    var insertPositionMarker = '\uFFFD'; // Unicode REPLACEMENT CHARACTER -- http://www.fileformat.info/info/unicode/char/fffd/index.htm

    grunt.util.linefeed = "\n";
    /**
     * Normalize the files paths for window (\) and unix (/)
     * 
     * @function normalizePaths
     * @return {String} 
     */
     function normalizePaths (path) {
        return path.replace(/\\/g, '/');
     }

    /**
     * @constructor create a new instance of tags task
     */
    function Tags (options) {
        this.options = this.processOptions(options);
    }

    /**
     * process options, overriding defaults
     */
    Tags.prototype.processOptions = function (options) {
        var processedOptions = {};

        processedOptions.notice = options.notice || '';

        processedOptions.openTag = options.openTag || '<!-- start auto template tags -->';
        processedOptions.closeTag = options.closeTag || '<!-- end auto template tags -->';

        /**
         * @kludge should not have to hack around for templates
         */
        processedOptions.notice = processedOptions.notice;
        
        /**
         * get the openTag line from content
         */
        processedOptions.getIndentWithTag = new RegExp("([\\s\\t]+)?" + processedOptions.openTag);

        /**
         * replace newlines with empty string from @this.getIndentWithTag
         */
        processedOptions.replaceNewLines = new RegExp(EOL, "g");

        /**
         * indent size @this.openTag
         */
        processedOptions.indent = '';

        return processedOptions;
    };

    /**
     * this is the main method that process and modified files, adding tags along the way!
     *
     * @method processFile
     */
    Tags.prototype.processFile = function (destFiles) {
        var that = this;
        var tagsText = '';
        var res = '';

        destFiles.forEach(function (destFile) {
            var fileContents = grunt.file.read(destFile);
            var filePath = path.dirname(destFile);
            var matches = fileContents.match(that.options.getIndentWithTag);

            /**
             * get the indent along with this.options.openTag
             */
            if (matches && matches[1]) {
                /**
                 * get the indent size by replacing this.options.openTag with empty string
                 */
                that.options.indent = matches[1].replace(that.options.replaceNewLines, '');
            }

            var ext = path.extname(destFile);

            if (ext === '.js') {
                res = that.generateTag(destFile);
            } else if (ext === '.html') {
                that.validateTemplateTags(destFile, fileContents);
                tagsText = that.options.indent + that.generateTag(destFile);
                res = that.addTags(fileContents, tagsText);
            } else {
                res = fileContents;
            }

            
            
            grunt.file.write(destFile, res);
        });
    };

    /**
     * validate the given file contents contain valid template tags
     */
    Tags.prototype.validateTemplateTags = function (fileName, fileContents) {
        // get locations of template tags
        // used to verify that the destination file contains valid template tags
        var openTagLocation = fileContents.indexOf(this.options.openTag);
        var closeTagLocation = fileContents.indexOf(this.options.closeTag);

        // verify template tags exist and in logic order
        if (closeTagLocation < openTagLocation || openTagLocation === -1 || closeTagLocation === -1) {
            grunt.fail.fatal('invalid template tags in ' + fileName);
        }
    };

    /**
     * generate a template tag for provided file
     */
    Tags.prototype.generateTag = function (relativePath) {
        var ext = path.extname(relativePath);
        var data = {
            data: {
                path: relativePath
            }
        };
        var tagsText = '';
        var fileContents = grunt.file.read(relativePath);
        var replacing_previous = false;

        if (ext === '.js') {
            var insertPositionMarker_re = new RegExp(insertPositionMarker, 'g');
            fileContents = this.defaultOldBannerRemover(fileContents, this.options.notice, insertPositionMarker);

            replacing_previous = (fileContents.indexOf(insertPositionMarker) >= 0);

            return ( replacing_previous ) ? fileContents.replace(insertPositionMarker_re, this.options.notice) :
                         this.options.notice + EOL + fileContents.replace(insertPositionMarker_re, '');
        } else if (ext === '.html') {
            var notice = this.options.notice.replace(new RegExp('(//\\n)+', "gm"), '\n').replace(new RegExp('(//\\s)+', "gm"), '');
            return grunt.template.process(notice, data) + EOL;
        } else {
            return ''
        }
    };

    /**
     * add the tags to the correct part of the destination file
     */
    Tags.prototype.addTags = function (fileContents, tagsText) {
        var beginning = fileContents.split(this.options.openTag)[0];
        var end = fileContents.split(this.options.closeTag)[1];

        return beginning +
               this.options.openTag + EOL +
               tagsText +
               this.options.indent + this.options.closeTag +
               end;
    };

    /**
     * defaultOldBannerRemover
     */
    Tags.prototype.defaultOldBannerRemover = function (fileContents, newBanner, insertPositionMarker /* , src, options */) {
        // Find a full-lines-spanning comment with the phrase `Copyright (c) <year/name/blah>` in it, case-insensitive and `(c)` being optional.
        // That will be our old banner and we kill the *entire* comment, it being C or C++ style, multiline or not.
        // 
        // We only accept comments which start at column 1, i.e. at the left edge. Anything else is considered a minor - and thus irrelevant - comment. 
        
        // Regex for the question: do we have one line in there which starts with `Copyright <blabla>`?
        // It's okay when it's preceded by some basic comment markers, but it MUST be followed by at *least*
        // one(1) character of 'bla bla', whatever that blurb actually may be.
        var copyright_re = /(^|\r\n|\n|\r)[\/*#|\s]*Copyright\s+[^\s\r\n]+/i;
        // Regex for the question: do we have a one-or-many lines covering C comment? 
        var c_comment_re   = /(^|\r\n|\n|\r)\/\*[^\0]*?\*\/\s*($|\r\n|\n|\r)/gi;
        // Regex for the question: do we have a single or a whole *consecutive* bunch of `//` prefixed C++ style comment lines?
        var cpp_comment_re = /(^|\r\n|\n|\r)(?:\/\/[^\n\r]*(?:\r\n|\n|\r))*\/\/[^\n\r]*($|\r\n|\n|\r)/gi;

        var check_n_replace = function (match, p1, p2) {
            if (copyright_re.test(match)) {
                // got one!
                return p1 + insertPositionMarker + p2;
            }
            // else: no dice! Do *not* alter:

            return match;
        }

        // We *do* expect the exceptional case of multiple old banners (and in different formats)
        // to sit in the input file: we want to kill/replace them *all*!
        // 
        // Hence we execute both regex replacements, irrespective of whether the first replace already
        // delivered a hit. 
        // 
        // To emphasize: we want *all* the banners in there and kill/replace them *all*!
        fileContents = fileContents.replace(c_comment_re, check_n_replace);
        fileContents = fileContents.replace(cpp_comment_re, check_n_replace);
        return fileContents;
    }

    //
    // register tags grunt task
    //
    grunt.registerMultiTask('copyright-notice', 'Dynamically add copyright notice to your js, html files', function () {
        var that = this;
        var tags = new Tags(that.options());

        // for each destination file
        this.files.forEach(function (file) {
            tags.processFile(file.src);
        });
    });
};
