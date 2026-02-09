// https://github.com/DanySK/semantic-release-preconfigured-conventional-commits#configuration
// MAJOR release
// 		Any commit type and scope terminating with ! causes a BREAKING CHANGE
// MINOR release
// 		Commit type chore with scope api-deps (Dependency updates)
// 		Commit type feat (Features) with any scope
// PATCH release
// 		Commit type chore with scope core-deps (Dependency updates)
// 		Commit type fix (Bug Fixes) with any scope
// 		Commit type docs (Documentation) with any scope
// 		Commit type perf (Performance improvements) with any scope
// 		Commit type revert (Revert previous changes) with any scope
// No release
// 		Commit type test (Tests)
// 		Commit type ci (Build and continuous integration)
// 		Commit type build (Build and continuous integration)
// 		Commit type chore with scope deps (Dependency updates)
// 		Commit type chore (General maintenance) with scopes different than the ones mentioned above
// 		Commit type style (Style improvements) with any scope
// 		Commit type refactor (Refactoring) with any scope

module.exports = {
	plugins: [
		['@semantic-release/commit-analyzer', {
			preset: 'conventionalcommits',
			presetConfig: {
				types: [
					{type: '*!', section: "BREAKING CHANGES"},
					{type: 'feat', section: "Features"},
					{type: 'chore', scope: 'deps', section: "Dependency updates"},
					{type: 'chore', scope: 'dev-deps', section: "Dev dependency updates"},
					{type: 'fix', section: "Bug Fixes"},
					{type: 'docs', section: "Documentation"},
					{type: 'perf', section: "Performance improvements"},
					{type: 'revert', section: "Revert previous changes"},
					{type: 'test', section: "Tests"},
					{type: 'ci', section: "Build and continuous integration"},
					{type: 'build', section: "Build and continuous integration"},
					{type: 'chore', section: "General maintenance"},
					{type: 'style', section: "Style improvements"},
					{type: 'refactor', section: "Refactoring"},
				]
			},
			releaseRules: [
				{type: '*!', release: 'major'},
				{type: 'chore', scope: 'deps', release: 'patch'},
				{type: 'chore', scope: 'dev-deps', release: false},
				{type: 'build', scope: 'docker', release: 'patch'},
				{type: 'ci', release: false},

				// {type: 'chore', scope: 'api-deps', release: 'minor'},
				// {type: 'chore', scope: 'core-deps', release: 'patch'},
				// {type: 'chore', scope: 'deps', release: 'patch'},
				// {type: 'docs', release: 'patch'},
				{type: 'revert', release: 'patch'},
			]
		}],
		['@semantic-release/release-notes-generator', {preset: 'conventionalcommits'}],
		// '@semantic-release/git',
		'@semantic-release/github',
	],
};
