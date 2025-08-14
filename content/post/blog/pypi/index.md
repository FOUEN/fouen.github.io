---
title: "¿Cómo subir un paquete a Pypi?"
date: 2024-06-17
cover: images/pypi.png
tags: ["Pypi", "python"]
mermaid: true
categories:
    - "blog"
---



## Configuración básica

1. Iniciar sesión en [pypi](https://pypi.org/account/register/)

2. Crear un token:

```mermaid
graph LR;
	A[Perfil]-->B[Account settings];
	B-->C[API tokens]
```

3. Crear un archivo `.pypirc` en `/root`:

```
[pypi]
	username = __token__
	password = (token)
```


-----

## Creación del paquete

1. Crea la carpeta principal:

```shell
mkdir proyecto1
```

2. Dentro de esta crea la carpeta dónde pondrás tu código, un setup.py y un README.md

```shell
mkdir codigo
touch setup.py README.md
```

3. Dentro de la carpeta de `codigo` crea un `__init__.py`:

```shell
touch __init__.py
```

4. Crea tus utilidades

```shell
touch utilidad1.py utilidad2.py
```

----

## Configuración del paquete

1. Dentro del `__init__.py` tienes que importar todo de las utilidades que hayas creado, por ejemplo:

```python
from .utilidad1 import *
from .utilidad2 import *
```

2. Configura tu `setup.py` con esta estructura:

```python
from setuptools import setup, find_packages  
  
with open("README.md", "r", encoding="utf-8") as fh:  
   long_description = fh.read()  
  
setup(  
   name="proyecto1",  
   version="0.1.0",  
   packages=find_packages(),  
   install_requires=[],  
   author="tu_nombre",  
   description="Una descripción de que trata el paquete",  
   long_description=long_description,  
   long_description_content_type="text/markdown",  
   url="Si tienes una web la puedes poner aquí",  
)
```

3. Configuración del `README.md`, aquí tienes que poner un archivo en `markdown` que explique cómo funciona tu paquete, como se instala, sus utilidades y lo que tu quieras

```md
# Proyecto1  
  
Descripción  
  
## Instalation  
  
Install de package using pip3  
   
pip3 install proyecto1
 
  
## Functionalities  

Aquí pon como funciona tu paquete
```  

----

## Subir paquete a Pypi

1. Instala twine

```shell
pip3 install twine
```

2. Crear un directorio `dist` con el proyecto comprimido, para esto solo tenemos que ejecutar este comando:

```shell
python3 -m build
```

3. Subir el comprimido a `pypi`: 

```shell
cd dist
twine upload dist/* --verbose
```

Ya esta! Con esto ya deberías tener tu paquete subido a `Pypi` 