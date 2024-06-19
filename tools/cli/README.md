# Ntlango Operations CLI

This repository contains a python source code for the Ntlango CLI. This tool is used to perform common operations for the Ntlango system.

## Getting Started

To get started with this tool, follow these steps:

### <u>Install Python3</u>

To use this tool, ensure that you have `python3`, if not, you can install it.

> Write instructions to install python3


### <u>Clone the repository</u>

```bash
$ git clone <repository-url>
```

### <u>Set the Python environment</u>

We use Python `virtual environments` to run this tool.

Create the virtual environment, run the command:


```bash
$ python3 -m venv .ntlango-env
```

Activate the virtual environment, run the command:

```bash
$ . .ntlango/bin/activate
```

Install ntlango to the python virtual environment, run the command:

```bash
$ pip install .
```

To deactivate the virtual environment, run the command:

```bash
deactivate
```

### <u>You are ready to use the tool<u>

To see all the supported operations, run the command:

```bash
$ ntlango --help
```