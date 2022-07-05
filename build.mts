import * as esbuild from 'esbuild';
import * as fs from 'fs';
import { options, helpText } from './argIntake.mjs';
import { loggingPlugin, typecheckPlugin } from './buildPlugins.mjs';

if (options.help) {
	console.log(helpText);
	process.exit(0);
}

let aliasesDir = "aliases";
let entryPoints = fs.readdirSync(aliasesDir).map(i => `${aliasesDir}/${i}`);


let logName = `\u001b[36m${'supibot'}\u001b[39m`;
try {
	esbuild.build({
		drop: ["console"],
		bundle: true,
		target: "es2021",
		entryPoints,
		watch: options.watch,
		minify: options.minify,
		logLevel: 'warning',
		treeShaking: true,
		outdir: "build",
		platform: "neutral",
		plugins: [
			loggingPlugin(logName),
			typecheckPlugin(logName)
		]
	});
} catch {
	// Errors are printed to stdout by esbuild.
	// Errors here are repeated information and look uglier
}

process.on('SIGINT', () => {
	// Wave emoji
	console.log("Bye bye, 👋");
	process.exit();
});
