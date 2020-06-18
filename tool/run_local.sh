pip3 install protobuf
protoc -I=./ --python_out=./ ./stat_config.proto

python3 util.py
