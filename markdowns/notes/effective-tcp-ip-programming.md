# Effective TCP/IP Programming - 44 Tips to Improve your  Network Programs

---

So you're reading this. Well, go on, but before that, I want to tell you a few things. Actually, these notes are just a summary of a book I read, 'Effective TCP/IP Programming - 44 Tips to Improve Your Network Programs' by Jon C. Snader. I highly recommend supporting this author by buying a copy of this book. I have a copy myself. I'm writing this not to steal the work of the author, just for my reference, but this might help other people, so I'm sharing it with you guys.

I'll make sure to give references and other resources that I used while studying this book, and I'll also link the repository containing the code I used in these notes.

I mostly followed this book's structure, I mean the syllabus, and forgive me for my English; I'm not a native English speaker, but I'm getting used to it. I'll try my best to convey the information that I know.

The source code is written in the programming language known as C, which I happen to know. If you don't know C, it's okay; just understand the workings of network applications. Try implementing them in your favourite language. If you know C, you're good to go.

The contents of these notes are divided into 4 chapters:

- Chapter 1 - Introduction
- Chapter 2 - Basics
- Chapter 3 - Building Effective and Robust Network Programs
- Chapter 4 - Tools and Resources

---
## Introduction

The purpose of these notes is to help you understand the underlying workings of high-level HTTP/HTTPS web frameworks, particularly focusing on comprehending their network components. These frameworks delve deeper into aspects such as asynchronous runtime, multi-threading, and interprocess communication, but we won't be exploring those here. Our focus lies in comprehending the TCP/IP protocol.

TCP/IP was a widely used method for creating network applications before the inception of the web itself. It is an open standard and could interconnect machines from different vendors, increasingly utilized for building networks and network applications.

Our approach to acquiring this knowledge involves addressing several common problems that beginning network programmers often encounter. Many of these issues stem from misconceptions or an incomplete understanding of the TCP/IP protocol and the APIs used to communicate with them.

### A Few Conventions

The content and program used in this notes are intended to be portable between UNIX(32 or 64 bit) and the Microsoft Win32 API.
I am using UNIX based machine (Arch BTW), So I hope you could make sure determine problem based your system or raise a issue in the repo and I will try to fix it. And try to support the repo but contributing to issues and help other who are learning.

So they are minor convention used in more I could like to mention it here... UNIX programmer will look notion of socket descriptors being defined as type _SOCKET_ instead of type _int_ for instance. Similarly, we avoid, for the most part, using _read_ and _write_ on sockets because the Win32 API does not support these system calls on sockets. We will often speak of a read of or write to a socket, but we are speaking generically. By "read" we mean _recv_, _recvfrom_, or _recvmsg_; by "write" we mean _send_, _sendto_ or _sendmsg_ .

This note only using of IPv4 we are going to consider IPv6 right now. Almost everything in this notes remains true whether IPv4 or IPv6 is being used.

### Client-Server Architecture

Although we commonly refer to entities as the 'client' and 'server,' it's not always evident in the general case which role a particular program is playing. Often, these programs act more like peers, exchanging information without one clearly serving the other. However, with TCP/IP, the distinction becomes much clearer. The 'server' typically listens for TCP connections or unsolicited UDP datagrams from a client or multiple clients. Looking at it from the client's perspective, a client is usually the one who initiates communication.

After understanding the roles of servers and clients, let's consider the abstract example of a typical client-server situation. The figure below describes three situations based on the location of the server and client. Situation (a) involves both the server and client residing on the same host. This configuration is the simplest because no physical network is involved. Output data follows the usual path down the TCP/IP stack. However, instead of being placed on a network device's output queue, it loops back internally and travels back up the stack as input.

![figure1_1.png](https://xyfltawoiafeaqbptzqa.supabase.co/storage/v1/object/public/open/assets/notes/effective-tcp-ip-programming/figure1_1.png)

There are several advantages to this setup during development. Firstly, there's no network latency, aiding in testing raw performance. Secondly, it provides an idealized laboratory environment where packets are neither dropped nor delivered out of order. Finally, development becomes more manageable and convenient when debugging on the same machine.

In our second client-server setup, the client and server are on different machines within the same LAN. A real network comes into play here, but this environment remains nearly ideal. Packet loss is rare, and they almost never arrive out of order. This scenario is commonly found in production environments.

The third type of client-server situation involves a client and server separated by a WAN. This WAN could be the Internet or a corporate intranet, but the crucial aspect is that the two applications are not on the same LAN, and IP datagrams between them pass through one or more routers. This environment is more challenging than the first two. As the volume of WAN traffic increases, the router queues used to temporarily store packets until forwarding can fill up. When the router's queues run out of space, packets are dropped. Consequently, this leads to retransmissions, causing duplicate and out-of-order delivery of packets.

### Basic Sockets API Review

In this section we review the basic sockets API and use it to build rudimentary client and server application. Understanding this section is very important because this lay the base essential characteristics of a TCP Client and Server.

Let's start with the API calls we need for a simple client. The Figure below show the basic socket calls that are used by every client. The address of our peer is specified in a *sockaddr_in* in structure that is passed to connect.

![figure1_2.png](https://xyfltawoiafeaqbptzqa.supabase.co/storage/v1/object/public/open/assets/notes/effective-tcp-ip-programming/figure1_2.png)

Generally the first thing we must do is to obtain a socket for establishing a connection to the server. We do this socket system call to obtain it.

```c
#include <sys/socket.h>     // UNIX
#include <winsock2.h>       // Windows

SOCKET socket(int domain, int type, int protocol);

/*

Parameters:
	- domain: Set the domain of work area     (AF_INET or AF_LOCAL)
	- type: Set type of socket (SOCK_STREAM - TCP, SOCK_DGRAM - UDP, SOCK_RAW)
	- protocol: Set the protocol type (0 for TCP/IP)

Returns: Socket descriptor on success, -1(UNIX) or INVALID_SOCKET(Windows) on failure

*/
```

The socket API is protocol independent and can support several different communication domains. The domain parameter is a constant that represents the desired communications domain.

The two most common domains are the AF_INET(or Internet) domain and the AF_LOCAL(or AF_UNIX) domain used for interprocess communication (IPC) on the same machine. 

The *type* parameter indicated the type of socket you need to be created.
- SOCK_STREAM - These sockets provide a reliable, full duplex connection-oriented byte stream. In TCP/IP this means TCP.
- SOCK_DGRAM - These sockets provide an unreliable, best-effort datagram service. In TCP/IP, this means UDP.
- SOCK_RAW - These sockets allow access to some datagrams at the IP layer. They are for special purposes such as listening for ICMP messages.

After Obtaining a socket we need to establish the connection to the server(peer):
```c
#include <sys/sockets.h>
#include <winsock2.h>

int connect (SOCKET s, const struct sockaddr *peer, int peer_len);

/*

Parameter:
- s: The Socket that we just obtained by the syscall.
- peer: Struct that contains the detail of the peer host(network id).
- peer_len: sizeof the peer struct

Returns: 0 on success, -1 (UNIX) or nonzero (Windows) on failure
*/

```

The *s* parameter is the socket descriptor returned by the *socket* call. The *peer* parameter points to the address structure that holds the address of the desired peer and some other information. For *AF_INET* domain, this is a *sockaddr_in* struct is used. The *peer_len* parameter is the size of the structure point to the peer.

Once we setting up the connection to the peer, We are ready to transfer data. 

> **_NOTE:_** In UNIX based system you can use syscall *write* or *read* as if your writing and reading from a file

To read and write we need to use *recv* and *send* when dealing with TCP connections and use *recvfrom* and *sendto* when dealing with UDP connection.

```c
#include <sys/socket.h>
#include <winsock2.h>

int recv(SOCKET s, void *buf, size_t len, int flags);
int send(SOCKET s, const void *buf, size_t len, int flags);

int recvfrom(SOCKET s, void *buf, size_t len, int flags, 
			 struct sockaddr *from, int fromlen);
int sendto(SOCKET s, const void *buf, size_t len, int flags
		   struct sockaddr *to, int tolen);
/*
Parameters:
	- s: Socket Descripto 
	- buf: Buffer that stores data to be send or to be received.
	- len: Sizeof the buffer
	- flags: These flags are used to modify the behaviour of the functoin (MSG_OOB, MSG_PEEK, MSG_DONTROUTE)
	- from & to: Peer struct information / datagram destination addresss.
	- fromlen & tolen: Length/Sizeof the struct from and to respectively.

Returns: Number of bytes transferred on success, -1 on failure
*/
```

Now after getting to know few function we are now ready to write a simple TCP client 

The following code is a simple TCP client that establish connect to server at 127.0.0.1:7500 that means they should run a server that listen for connection at that address . Right know we don't have one.... Lets complete the client first and Go to develop a server to get the message from the client afterwards.

```c
#include <arpa/inet.h>
#include <netinet/in.h>
#include <stdio.h>
#include <stdlib.h>
#include <sys/socket.h>
#include <sys/types.h>

int main(void) {
  struct sockaddr_in peer;
  int soc;
  int rc;
  char send_buf[] = "Hello from client";
  char recv_buf[250];
  peer.sin_family = AF_INET;
  peer.sin_port = htons(7500);
  peer.sin_addr.s_addr = inet_addr("127.0.0.1");

  soc = socket(AF_INET, SOCK_STREAM, 0);
  if (soc < 0) {
    perror("Socket Call Failed");
    exit(1);
  }

  rc = connect(soc, (struct sockaddr *)&peer, sizeof(peer));
  if (rc) {
    perror("Connection Call Failed");
    exit(1);
  }

  rc = send(soc, send_buf, sizeof(send_buf), 0);
  if (rc <= 0) {
    perror("Send Call Failed");
    exit(1);
  }

  rc = recv(soc, recv_buf, sizeof(recv_buf), 0);
  if (rc <= 0)
    perror("Send Call Failed");
  else
    printf("%s", recv_buf);
  exit(0);
}

```

Let's now summarize the TCP Client, First **Set up Our Peer Addreess** we fill the struct sockaddr_in with the server's port number (7500) and address (127.0.0.1) which is a loopback address. Secondly **Obtain a Socket  and Connect to Our Peer** we obtain a *SOCK_STREAM* socket (TCP Socket). We establish a connection with our peer by calling *connect*. Then We **Send and Receive a Message** and we print the message we got.

Before executing the client we need a server to accept a connection. So We need to write code for now. A server must listen for client connection on its well-known port . To Listen in particular port we use the *listen* call

![figure1_3.png](https://xyfltawoiafeaqbptzqa.supabase.co/storage/v1/object/public/open/assets/notes/effective-tcp-ip-programming/figure1_3.png)
