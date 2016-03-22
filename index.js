'use strict';

var gutil = require('gulp-util'),
    through = require('through2');

function rearrangeMQLs(options) {
  /**
   * options:
   *
   *{
      // log matched mqls to check whether everthing is ok or not.
      log: true,
      // todo: do not hardcode mqls
      // it's strongly recommended to define larger size mqls
      // first and let smaller size mqls override them later.
      mqlOrder: [
          "@media all and (min-width: 1200px)",
          "@media all and (max-width: 1199px)",
          "@media all and (max-width: 1023px)",
          "@media all and (max-width: 767px)",
          "@media all and (max-width: 479px)"
      ]
    }
   */  
  return through.obj(function (file, enc, cb) {
      var content = file.contents.toString(),
          ruleMap = {
            // mqlRule: [mqlDef, mqlDef...mqlDef],
          },
          curRuleBlock = [],
          combinedRules = [];

      if (file.isNull()) {
          this.push(file);
          return cb();
      }

      if (file.isStream()) {
          this.emit('error', new gutil.PluginError(PLUGIN_NAME,
            'Streaming not supported'));
          return cb();
      }

      // TODO: process comments.(by default no comment is allowed in
      // the output css otherwise it will have highly chances to throw 
      // resolving errors.)
      content = content.replace(/(@media[\s\S]+?)\s*\{([\s\S]+?\{[\s\S]+?\})\s*\}\s*/gim,
        function(match, mqlRule, mqlDef){
        if (options.log) {
          // gutil.log("----matched mql block----");
          gutil.log(match);
          // gutil.log("----end matched mql block----");
        }

        if (!ruleMap[mqlRule]) {
          ruleMap[mqlRule] = [];
        }

        ruleMap[mqlRule].push(mqlDef);

        return "";
      });

      for (var rule in ruleMap) {
        curRuleBlock = ["\n", rule, " {"];
        curRuleBlock.push.apply(curRuleBlock, ruleMap[rule]);
        curRuleBlock.push("\n}");

        // mqls which don't require a strict order can be put anywhere
        if (options.mqlOrder.indexOf(rule) < 0) {
          combinedRules.push(curRuleBlock.join(""));
        } else {
          // otherwise we need to follow a strict order later on
          ruleMap[rule] = curRuleBlock.join("");
        }
      }

      // it follows a "mobile device first" principle, which means
      // big size mqls always go first.
      // combine mqls with strict order. e.g. max-width: 1199px
      // should goes before max-width: 960px
      for (var i=0; i<options.mqlOrder.length; i++) {
        if (options.mqlOrder[i] in ruleMap) {
          combinedRules.push(ruleMap[options.mqlOrder[i]]);
        }
      }

      // output processed content
      // TODO: output extracted mqls to a single file
      file.contents = new Buffer(content + combinedRules.join("\n"));
      this.push(file);

      cb();
  });
};


module.exports = rearrangeMQLs;
