import os
import subprocess

from fabric import task, Connection

HOST = "ec2-34-255-100-55.eu-west-1.compute.amazonaws.com"
USER = "ubuntu"
KEY = os.path.expanduser("~/.ssh/AWSKeypair.pem")


def _conn():
    return Connection(HOST, user=USER, connect_kwargs={"key_filename": KEY})


@task
def deploy(c):
    """Push to main, pull on server, restart mnemo."""
    subprocess.run(["git", "push", "origin", "main"], check=True)
    with _conn() as srv:
        srv.run("cd /opt/mnemo && sudo git pull origin main")
        srv.run("sudo systemctl restart mnemo")
        srv.run("sudo systemctl status mnemo --no-pager")


@task
def status(c):
    """Show mnemo service status."""
    with _conn() as srv:
        srv.run("sudo systemctl status mnemo --no-pager")


@task
def logs(c, lines=50):
    """Tail mnemo logs."""
    with _conn() as srv:
        srv.run(f"journalctl -u mnemo -n {int(lines)} --no-pager")


@task
def restart(c):
    """Restart mnemo service."""
    with _conn() as srv:
        srv.run("sudo systemctl restart mnemo")
        srv.run("sudo systemctl status mnemo --no-pager")
