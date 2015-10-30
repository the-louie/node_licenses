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




recursive(process.argv[2], function (err, files) {
    var component_licenses = [];

    files.forEach(function(filepath) {
        if (path.basename(filepath) != "package.json")
            return;
        if (filepath.split('/').indexOf('test') != -1)
            return;

        // console.log(path.dirname(filepath).split('/').slice(-1)[0], path.basename(filepath));
            try {
                var fs = require("fs"); //Load the filesystem module
                var stats = fs.statSync(filepath);
                if(stats.size === 0)
                    return ;

                var json = require((filepath).replace('//','/'));
                if (json.license !== undefined) {
                    switch(typeof (json.license)) {
                        case "string":
                            component_licenses.push({filepath: filepath, component: path.dirname(filepath).split('/').slice(-1)[0], license: json.license });
                            break;
                        case "object":
                            if (json.license.type !== undefined) { // object
                                component_licenses.push({filepath: filepath, component: path.dirname(filepath).split('/').slice(-1)[0], license: json.license.type });
                            }
                            break;
                        default:
                            component_licenses.push({filepath: filepath, component: path.dirname(filepath).split('/').slice(-1)[0], license: "Unknown" });
                    }
                } else if (json.licenses !== undefined) {
                    if (typeof (json.licenses) === 'string') {
                        component_licenses.push({filepath: filepath, component: path.dirname(filepath).split('/').slice(-1)[0], license: json.licenses || "Unknown" });
                    } else if (json.licenses[0] !== undefined) { // list
                        json.licenses.forEach(function(license) {
                            component_licenses.push({filepath: filepath, component: path.dirname(filepath).split('/').slice(-1)[0], license: license.type || "Unknown" });
                        });
                    }
                } else {
                    component_licenses.push({filepath: filepath, component: path.dirname(filepath).split('/').slice(-1)[0], license: "Unknown" });
                    return;
                }
            } catch (e) {
                console.log("Error when loading", filepath);
                console.log(e);
                return;
            }


    });

    console.log( unique_components(component_licenses) );
    console.log("\n---\n");
    console.log( Object.keys(unique_licenses(component_licenses)) );
    console.log("\n---\n");
    console.log( unique_licenses(component_licenses).Unknown );

});