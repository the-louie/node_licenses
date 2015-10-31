var fs = require('fs');
var path = require('path');
var _ = require('lodash');
var recursive = require('recursive-readdir');

function unique_components(component_licenses) {
    var unique_licenses = [];
    var tmp = {};
    component_licenses.forEach(function(component_license) {
        tmp[component_license.component + component_license.license] = component_license;
    });
    return _.values(tmp);
}

function unique_licenses(component_licenses) {
    var tmp = {};
    component_licenses.forEach(function(component_license) {
        if (tmp[component_license.license]===undefined) {
            tmp[component_license.license] = [];
        }
        tmp[component_license.license].push(component_license);
    });
    return tmp;
}


function packagejson(filepath) {
    try {
        var fs = require("fs"); //Load the filesystem module
        var stats = fs.statSync(filepath);
        if(stats.size === 0)
            return ;

        var json = require((filepath).replace('//','/'));
        if (json.license !== undefined) {
            switch(typeof (json.license)) {
                case "string":
                    return {filepath: filepath, component: path.dirname(filepath).split('/').slice(-1)[0], license: json.license };
                    break;
                case "object":
                    if (json.license.type !== undefined) { // object
                        return {filepath: filepath, component: path.dirname(filepath).split('/').slice(-1)[0], license: json.license.type };
                    }
                    break;
                default:
                    return;

            }
        } else if (json.licenses !== undefined) {
            if (typeof (json.licenses) === 'string') {
                return {filepath: filepath, component: path.dirname(filepath).split('/').slice(-1)[0], license: json.licenses };
            } else if (json.licenses[0] !== undefined) { // list
                json.licenses.forEach(function(license) {
                    return {filepath: filepath, component: path.dirname(filepath).split('/').slice(-1)[0], license: license.type };
                });
            }
        } else {
            return;
        }
    } catch (e) {
        console.log("Error when loading", filepath);
        console.log(e);
        return;
    }
}

function licensefile(filepath) {

    return {filepath: filepath, component: path.dirname(filepath).split('/').slice(-1)[0], license: "textfile", licensetext: "" };
}

recursive(process.argv[2], function (err, files) {
    var component_licenses = [];

    files.forEach(function(filepath) {
        if (filepath.split('/').indexOf('test') != -1)
            return;

        if (path.basename(filepath) == "package.json") {
            // search package.json for a licence item
            component_licenses.push(packagejson(filepath));
        } else if (path.basename(filepath) == 'LICENSE') {
            // just get the text from the LICENSE file
            component_licenses.push(licensefile(filepath));
        }




    });

    console.log( unique_components(component_licenses) );
    console.log("\n---\n");
    console.log( Object.keys(unique_licenses(component_licenses)) );
    console.log("\n---\n");
    console.log( unique_licenses(component_licenses).Unknown );

});