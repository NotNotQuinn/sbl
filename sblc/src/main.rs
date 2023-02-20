enum AST {
    Pipe {
        commands: Vec<AST>,
    },
    Exec {
        command: String,
        arguments: Vec<String>,
    },
}

fn main() {
    println!("Hello, world!");
}

/*



Okay, theory crafting time.



*/
