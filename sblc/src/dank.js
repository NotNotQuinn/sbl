/**
 * Applies alias replacements with `contentArguments` as the alias arguments.
 *
 * Code snippet taken from [supibot-package-manager](https://github.com/Supinic/supibot-package-manager/blob/433bdf1e8de490a55530c0f0ae52a4624cb455b8/commands/alias/index.js#L18-L80) with slight modification.
 * @documentation See the "Replacements" section for the $alias command's help page on [supinic.com](https://supinic.com/bot/command/detail/alias).
 * @param {string[]} contentArguments The content to inject into.
 * @param {string[]} injectedArguments Arguments to inject into the content.
 */
function applyReplacements(contentArguments, injectedArguments) {
	const resultArguments = [];
	const numberRegex = /(?<order>-?\d+)(\.\.(?<range>-?\d+))?(?<rest>\+?)/;
	const strictNumberRegex = /^[\d-.+]+$/;

	for (let i = 0; i < contentArguments.length; i++) {
		const parsed = contentArguments[i].replace(/\${(.+?)}/g, (total, match) => {
			const numberMatch = match.match(numberRegex);
			if (numberMatch && strictNumberRegex.test(match)) {
				let order = Number(numberMatch.groups.order);
				if (order < 0) {
					order = injectedArguments.length + order;
				}

				let range = (numberMatch.groups.range) ? Number(numberMatch.groups.range) : null;
				if (typeof range === "number") {
					if (range < 0) {
						range = injectedArguments.length + range + 1;
					}

					if (range < order) {
						const temp = range;
						range = order;
						order = temp;
					}
				}

				const useRest = (numberMatch.groups.rest === "+");
				if (useRest && range) {
					return {
						success: false,
						reply: `Cannot combine both the "range" and "rest" argument identifiers!`
					};
				}
				else if (useRest) {
					return injectedArguments.slice(order).join(" ");
				}
				else if (range) {
					return injectedArguments.slice(order, range).join(" ");
				}
				else {
					return injectedArguments[order] ?? "";
				}
			}
			else if (match === "executor") {
				return executor;
			}
			else if (match === "channel") {
				return channel;
			}
			else {
				return total;
			}
		});

		resultArguments.push(...parsed.split(" "));
	}

	return {
		success: true,
		resultArguments
	};
};
