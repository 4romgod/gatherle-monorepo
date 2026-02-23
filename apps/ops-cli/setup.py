from setuptools import setup

setup(
    name='gatherle',
    version='1.0',
    install_requires=[
        'Click',
    ],
    entry_points='''
        [console_scripts]
        gatherle=gatherle:cli_entry
    '''
)
