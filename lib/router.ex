defmodule Router do
  use Plug.Router

  plug Corsica, origins: ["https://macroquad.purduehackers.com", "https://rust-mq.fly.dev"]
  plug(IdleTimerPlug)
  plug(:match)
  plug(:dispatch)

  post "/compile" do
    send_cmd_artifact(
      conn,
      command: "cargo",
      args: [
        "build", "--target", "wasm32-unknown-unknown", "--release", "--frozen", "--offline", "-j", "2",
      ],
      file: "target/wasm32-unknown-unknown/release/template.wasm",
      mime: "application/wasm"
    )
  end

  post "/download" do
    send_cmd_artifact(
      conn,
      command: "zip",
      args: ["-r", "project.zip", "src", "Cargo.lock", "Cargo.toml"],
      file: "project.zip",
      mime: "application/blob"
    )
  end

  get "/js/:file" do
    conn
    |> put_resp_header("content-type", "application/javascript")
    |> send_file(200, "frontend/js/#{file}")
  end

  get "" do
    send_file(conn, 200, "frontend/index.html")
  end

  match _ do
    send_resp(conn, 404, "404")
  end

  defp send_cmd_artifact(conn, command: command, args: args, file: file, mime: mime) do
    # body :: { code: string }
    {:ok, body, conn} = Plug.Conn.read_body(conn)
    code = body
           |> Jason.decode!()
           |> Access.get("code")

    # Copy the template to a build folder
    uuid = UUID.uuid4()
    build_path = "builds/#{uuid}"
    File.cp_r!("template", build_path)
    File.write!("#{build_path}/src/main.rs", code)

    # Run cargo and wait for it to finish
    parent = self()
    {:ok, task} = Task.start(fn ->
      case System.cmd(command, args, cd: build_path, stderr_to_stdout: true, parallelism: true) do
        {_output, 0} -> send(parent, :success)
        {err, _} -> send(parent, err)
      end
    end)
    IdleTimer.wait_for_process(task)

    # Send wasm to client and delete the build directory
    conn = receive do
      :success -> 
        conn 
        |> put_resp_header("content-type", mime)
        |> send_file(200, "builds/#{uuid}/#{file}")

      err ->
        conn
        |> send_resp(200, %{error: err} |> Jason.encode!())
    end

    File.rm_rf!("builds/#{uuid}")
    conn
  end
end
