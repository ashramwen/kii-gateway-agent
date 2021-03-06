# kii-gateway-agent
kii-gateway-agent for node modules written in TypeScript.

## DX & minimizing tech-debt
This package take an opinioned view on the Developer-Experience with an eye towards minimizing tech-debt.
There are two operations that will be part of a developer experience:
- `npm build`: cleans, lints, builds and tests with coverage metrics.
- `npm build:dist`: generates distribution artifacts

The process is meant to serve as an early-warning mechanism to catch issues that will cause
potentially expensive mishaps or re-work later in the project life-cycle.

## run-scripts
Since "lean"-ness is a primary goal, npm is used as a build tool.

The run-scripts used:
*aside:* To help with these, we recommend [npm-completion](https://docs.npmjs.com/cli/completion)?

    clean       : removes all generated directories
    prebuild    : cleans build and runs tslint (for large projects, remove the automatic clean)
    build       : builds the project
    postbuild   : runs tests
    test        : runs tests with coverage on generated JavaScript
    posttest    : remaps coverage report to source TypeScript
    build:watch : watch project files and rebuild when anything changes
    build:dist  : build a distribution (no tests)
    npm-sh      : spawn a new shell with local npm installs in path
    secure      : checks all installed dependencies for vulnerabilities
    check       : checks all installed dependencies for updates
    lcheck      : list dependencies not in compliance with project license requirements
    coverage    : prints coverage report over typescript source

## Structure
The `src` directory structure of a typical project:

    ├── KiiHelper
    │   ├── KiiBase.ts
    │   ├── KiiHelper.ts
    │   ├── KiiMqttHelper.ts
    │   └── index.ts
    ├── model
    │   ├── App.ts
    │   ├── EndNode.ts
    │   ├── Gateway.ts
    │   ├── User.ts
    │   └── index.ts
    ├── mqtt
    │   ├── mqttws31.d.ts
    │   └── mqttws31.js
    ├── index.ts
    └── test.ts

In addition, these directories are auto-created by the various scripts. The coverage & build directories are .gitignored. By design, dist directories are - for pure-Type/JavaScript packages, this is an advantage. If your package included native/compiled artifacts, it might need to be reconsidered.

    ├── coverage
    ├── dist
    └── build

### Why are there two tsconfig*.json files?
TypeScript compiler configuration, tsconfig.json does not support multiple build targets. To create separate builds then, one has to use multiple config files and invoke atleast one of them explicitly like we do.

Further, our opinioned preferences is to keep source and associated tests together in the source tree. This requires to compile time configurations - a regular build that includes


## License
Apache 2.0

## Support
Bugs, PRs, comments, suggestions welcomed!

