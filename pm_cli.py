import sys, socket
import requests as req

# Update pm_server_ip with the ip address of the computer where the poleymote server is running
# pm_server_ip = socket.gethostbyname(socket.gethostname())
pm_server_ip = "192.168.0.5"


if len(sys.argv) > 2:
	pm_server_ip = sys.argv[2]
if len(sys.argv) > 1:
	uri = 'http://' + pm_server_ip + '/cmd/spotify/'
	try:
		r = req.get(uri + sys.argv[1])
	except req.exceptions.ConnectionError:
		err = '''
Unable to connect to the PoleyMote server. 
Ensure it is running
If the server is running on a different PC, specify the IP address of that PC as the second option. 

For example:
	pm_cli.py playpause 192.168.0.105
		'''
		print err
else:
	help = '''
Syntax: python.exe pm_cli.py <option> [server ip (optional)]
Available Options:

playpause
thumbsup	thumbsdown
skipback	nexttrack
playshuffleplaylists
playstarred
deletelater	canceldeletelater
deleteartist	deletealbum

Server IP:
If the server is running on a different PC, specify the IP address of that PC as the second option. 

Examples:
pm_cli.py playpause
pm_cli.py thumbsup
pm_cli.py nexttrack 192.168.0.10

Change the extension of this file from .py to .pyw to run this file silently if you are on Windows.
	'''
	print help
