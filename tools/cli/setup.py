from setuptools import setup

setup(
    name='ntlango',
    version='1.0',
    install_requires=[
        'Click',
    ],
    entry_points='''
        [console_scripts]
        ntlango=ntlango:cli_entry
    '''
)
