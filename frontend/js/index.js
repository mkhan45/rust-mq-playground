function load(stream) {
    var a = stream;

    register_plugins(plugins),
        typeof WebAssembly.compileStreaming == 'function' ? WebAssembly.compileStreaming(a).then(a=>(add_missing_functions_stabs(a), WebAssembly.instantiate(a, importObject))).then(a=>{
            wasm_memory = a.exports.memory,
                wasm_exports = a.exports;
            var b = u32_to_semver(wasm_exports.crate_version());
            version != b && console.error('Version mismatch: gl.js version is: ' + version + ', rust sapp-wasm crate version is: ' + b),
                init_plugins(plugins),
                a.exports.main()
        }).catch(a=>{
            console.error('WASM failed to load, probably incompatible gl.js version'),
                console.error(a)
        }) : a.then(function (a) {
            return a.arrayBuffer()
        }).then(function (a) {
            return WebAssembly.compile(a)
        }).then(function (a) {
            return add_missing_functions_stabs(a),
                WebAssembly.instantiate(a, importObject)
        }).then(function (a) {
            wasm_memory = a.exports.memory,
                wasm_exports = a.exports;
            var b = u32_to_semver(wasm_exports.crate_version());
            version != b && console.error('Version mismatch: gl.js version is: ' + version + ', rust sapp-wasm crate version is: ' + b),
                init_plugins(plugins),
                a.exports.main()
        }).catch(a=>{
            console.error('WASM failed to load, probably incompatible gl.js version'),
                console.error(a)
        })
}

let editor = ace.edit("editor")
editor.session.setMode("ace/mode/rust");

function compile_and_load() {
    document.querySelector("#compile-btn").innerHTML = "Compiling...";

    let params = {
        body: JSON.stringify({ code: editor.getValue() }),
        method: "POST"
    };

    fetch("/compile", params)
    .then(resp => {
        let cloned = resp.clone();

        resp.text().then(text => {
            if (isJSON(text)) {
                // compliation error'd
                let json = JSON.parse(text);
                let error_msg = json["error"];
                alert(error_msg);
            } else {
                load(cloned);
            }
            document.querySelector("#compile-btn").innerHTML = "Compile";
        });
    })
}

function downloadProject() {
    let params = {
        body: JSON.stringify({ code: editor.getValue() }),
        method: "POST"
    };


    document.querySelector("#download-btn").innerHTML = "Compressing...";
    fetch("/download", params)
    .then(resp => resp.blob())
    .then(blob => {
        let a = document.createElement('a');
        a.href = window.URL.createObjectURL(blob);
        a.download = "rust-mq-project.zip";
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        document.querySelector("#download-btn").innerHTML = "Download";
    });
}

function isJSON(str) {
    try {
        let parsed = JSON.parse(str);
        return typeof parsed === "object";
    } catch (e) {
        return false;
    }
}