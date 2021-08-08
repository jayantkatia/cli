import {Command} from '@oclif/command'
const fs = require('fs')
const {cli} = require('cli-ux')
const inquirer = require('inquirer')
const chalk = require('chalk')

export default class Init extends Command {
  static description = 'initializes upptime';

  async run() {
    let monitor_name
    let graphs_name
    let pages_name
    // user inputs for config
    const monitor_responses = await inquirer.prompt([
      {
        name: 'monitor',
        message: 'Select Monitor Package',
        type: 'list',
        choices: [
          {name: '@upptime/uptime-monitor'},
          {name: 'custom package'},
        ],
      },
    ])
    if (monitor_responses.monitor === 'custom package') {
      monitor_name = await cli.prompt('Enter the custom monitor package name')
    } else {
      monitor_name = monitor_responses.monitor
    }
    const graphs_responses = await inquirer.prompt([
      {
        name: 'graphs',
        message: 'Select Graphs Package',
        type: 'list',
        choices: [
          {name: '@upptime/graphs'},
          {name: 'custom package'},
        ],
      },
    ])
    if (graphs_responses.graphs === 'custom package') {
      graphs_name = await cli.prompt('Enter the custom graphs package name')
    } else {
      graphs_name = graphs_responses.graphs
    }

    const pages_responses = await inquirer.prompt([
      {
        name: 'pages',
        message: 'Select pages Package',
        type: 'list',
        choices: [
          {name: '@upptime/pages'},
          {name: 'custom package'},
        ],
      },
    ])
    if (pages_responses.pages === 'custom package') {
      pages_name = await cli.prompt('Enter the custom pages package name')
    } else {
      pages_name = pages_responses.pages
    }

    const issue_provider = await cli.prompt('Enter the issue provider name')
    const issue_owner = await cli.prompt('Enter the issue owner name')
    const issue_repo = await cli.prompt('Enter the issue repo name')
    const issue_pat = await cli.prompt('Enter the issue personal access token', {
      type: 'mask',
    })
    const commit_limit = await cli.prompt('Enter the limit for commits')

    const fileData =
`packages:
  monitor: ${monitor_name}
  graphs: ${graphs_name}
  pages: ${pages_name}

issues:
  provider: ${issue_provider}
  owner: ${issue_owner}
  repo: ${issue_repo}
  pat: ${issue_pat}

commits:
  limit: ${commit_limit}
`
    await fs.writeFileSync('.uclirc.yml', fileData)
    await this.log(chalk.green.inverse('✅ initialized successfully'))
  }
}
