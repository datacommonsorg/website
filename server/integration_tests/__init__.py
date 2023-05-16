import multiprocessing
import os
import sys

if sys.version_info >= (3, 8) and sys.platform == "darwin":
  multiprocessing.set_start_method("fork", force=True)
  os.environ['no_proxy'] = '*'