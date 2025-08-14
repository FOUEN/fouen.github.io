---
title: "🟢Friendly"
date: 2024-04-02
description: "Friendly writeup"
tags: ["cybersecurity", "writeup", "Friendly"]
---

>Esta es la resolución de la maquina Friendly

## Reconocimiento

Al abrir esta maquina ya nos proporciona su IP: 10.115.11.124

Hago un  `ping 10.115.11.124` para ver que tenga conexión con la maquina:

![img](20240402103105.png)

Haciendo ping podemos ver por ejemplo que la maquina es un Linux ya que que el ttl que nos proporciona es 64

![img](20240402103310.png)

Ahora que tenemos conexión vamos a escanear los puertos:

Ejecutare este comando: `nmap -p- --open -sV -v 10.115.11.124` 

-p- : Escanea todos los puertos 

--open : Detecta solo los que estan abiertos

-sV : Detecta las versiones de los servicios

-v : Da información a tiempo real de como va el escaneo

![img](20240402104045.png)

## Explotación

Podemos ver que tenemos los puertos 21/tcp y 80/tcp

Puerto 21: FTP
Puerto 80: HTTP

El puerto 80 nos indica que hay una web activa, vamos a ver que hay en la web:  

![img](20240402104359.png)

La web simplemente es la pagina default de Apache

Vamos a ver si nos podemos conectar al FTP:

![img](20240402105146.png)

Hemos podido conectaros como anonymous y vemos que hay un archivo index.html (Seguramente la web)

Vamos a probar a subir algo para ver si tenemos permisos:

![img](20240402105454.png)

Como vemos si que tenemos permiso para subir cosas

Como tenemos permiso y la web esta subida al FTP vamos a crear un archivo php malicioso para poder ejecutar comandos desde su maquina:

![img](20240402110433.png)

Vamos a subir el archivo:

![img](20240402110148.png)

Ahora vamos a intentar ejecutar comandos en la web:

![img](20240402111500.png)

Como podemos ver si que nos deja

Ahora tenemos que pasarnos la terminal, primero vamos a ponernos en escucha por el puerto 443 para recibirla por ese puerto:

![img](20240402112004.png)

Ahora que estamos en escucha tenemos que poner la reverse shell en la url de la web:

![img](20240402112635.png)

#### TTY Upgrade

`script /dev/null -c bash` 

`^z`

`stty raw -echo; fg`

`reset`

`xterm`

`export TERM=xterm SHELL=bash`


Ya estamos dentro de la maquina y podemos ver la primera flag:

![img](20240402114427.png)

## Escalada de privilegios

Hacemos `sudo -l`

Podemos ver que `vim` se puede ejecutar como root sin usar contraseña

Ponemos este comando para escalar de privilegios 
```
sudo vim -c ':!/bin/bash'
```

![img](20240402115243.png)

Ya como root vemos el contenido de la root flag y nos pone que aun no tenemos que buscar el archivo asique ejecutamos este comando:

```
find / -name root.txt 2>/dev/null
```

![img](20240402115437.png)

Vemos que hay otro archivo con el mismo nombre en otra ruta, lo abrimos y si que es la flag:

![img](20240402115604.png)

