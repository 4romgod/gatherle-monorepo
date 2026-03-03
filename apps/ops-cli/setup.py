from setuptools import setup, find_packages

setup(
    name='gatherle',
    version='1.0.0',
    packages=find_packages(),
    python_requires='>=3.11',
    install_requires=[
        'click>=8.1',
        'pymongo>=4.7',
        'python-dotenv>=1.0',
    ],
    entry_points='''
        [console_scripts]
        gatherle=gatherle:cli_entry
    '''
)
