if( /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ) {
    document.body.innerHTML = "Mobile devices unsupported";
} else {
    let error_msg_div = document.querySelector("#error-msg");
    let error_body_el = document.querySelector("#error-body");

    function toggle_error_msg() {
        error_msg_div.classList.toggle("error-msg-container-shown");

        if (error_msg_div.classList.contains("error-msg-container-shown")) {
            document.querySelector("#editor-container").style.height = "50vh";
            document.querySelector("#error-btn").innerHTML = "Hide Error Panel";
        } else {
            document.querySelector("#error-btn").innerHTML = "Show Error Panel";
            document.querySelector("#editor-container").style.height = "92vh";
            for (let i = 1; i <= 10; i += 1)
                setTimeout(_ => editor.resize(), i * 10);
        }

        setTimeout(_ => editor.resize(), 110);
    }

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

        fetch("https://rust-mq.fly.dev/compile", params)
            .then(resp => {
                let cloned = resp.clone();

                resp.text().then(text => {
                    if (isJSON(text)) {
                        // compliation error'd
                        let json = JSON.parse(text);
                        let error_msg = json["error"];
                        error_body_el.innerHTML = error_msg.trim();
                        if (!error_msg_div.classList.contains("error-msg-container-shown"))
                            toggle_error_msg();
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

    let drag_state = null;

    const editor_column = document.querySelector("#editor-column");
    const canvas = document.querySelector("#glcanvas");

    function toggleEditor() {
        if (editor_column.style.display === "none") {
            editor_column.style.display = "block";
            canvas.style.width = "50%";
            editor_column.style.width = "50%";
        } else {
            editor_column.style.display = "none";
            canvas.style.width = "100%";
        }
    }

    function toggleDemo() {
        if (canvas.style.display === "none") {
            canvas.style.display = "block";
            canvas.style.width = "50%";
            editor_column.style.width = "50%";
        } else {
            canvas.style.display = "none";
            editor_column.style.width = "100%";
        }
    }

    document.querySelector("#dragbar").addEventListener('mousedown', ev => {
        drag_state = {
            mouse_pos: { x: ev.clientX, y: ev.clientY },
        };
    });

    document.addEventListener("mouseup", _ => {
        drag_state = null;
    });

    document.addEventListener('mousemove', ev => {
        if (drag_state === null) return;

        let x_percent = drag_state.mouse_pos.x / document.body.clientWidth * 100;
        editor_column.style.width = `${x_percent}%`;
        editor.resize();

        let canvas_width_percent = 100 - x_percent;
        canvas.style.width = `${canvas_width_percent}%`;

        // canvas.width = canvas_width_ratio / canvas.clientWidth;
        // let canvas_width_px = canvas_width_ratio * canvas_width_percent;
        // console.log(canvas.width, canvas_width_px);
        // canvas.width = canvas_width_px;

        drag_state.mouse_pos = { x: ev.clientX, y: ev.clientY };
    });
}
