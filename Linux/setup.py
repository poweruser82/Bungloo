#!/usr/bin/env python2

import os
from distutils.core import setup

files = []
for dirname, dirnames, filenames in os.walk('bungloo/WebKit'):
    for filename in filenames:
        files += [os.path.join(dirname, filename)[8:]]

for dirname, dirnames, filenames in os.walk('bungloo/images'):
    for filename in filenames:
        files += [os.path.join(dirname, filename)[8:]]

setup(
    name = "bungloo",
    version = "0.1",
    author = "Jeena Paradies",
    author_email = "spam@jeenaparadies.net",
    url = "https://github.com/jeena/bungloo",
    license = "BSD license",
    packages = ['bungloo'],
    package_data = {"bungloo": files},
    scripts = ["bin/bungloo"]
    )
