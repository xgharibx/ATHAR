# Usage: pip install onnx numpy; python tools/quran2/tajweed/tafkheem_patch.py public/data/quran2/tajweed/tafkheem.onnxpatch
"""The tafkhim / tarqiq head of HisnLabs Tajweed v2 (Apache-2.0) as a patch for its int8 ONNX model.

onnx/model-int8.onnx has only the phoneme head; model.safetensors (the same revision) has all eleven. This reads
only the tafkhim head's bytes from model.safetensors (HTTP ranges: its header, then 8 KB), and writes a ModelProto
that holds nothing but a graph with three nodes (MatMul, Add, LogSoftmax on the encoder's last layer norm), the two
weights and an output «tafkheem» [batch, frames, 4]. Appended to model-int8.onnx, protobuf merges the two graphs
(an embedded message given twice is merged, its repeated fields joined), so the model gains the output and nothing
else changes: its phoneme output stays bit for bit the same (checked in ONNX Runtime and ONNX Runtime Web). The app
appends it on the device, after checking the model's SHA-256 (src/quran2/tajweed/engine.ts)."""
import json, struct, sys, urllib.request
import numpy as np
import onnx
from onnx import helper, numpy_helper, TensorProto

URL = 'https://huggingface.co/Hisnlabs/tajweed-v2/resolve/b3b0503d32b4d9a8a0447880b4564fd3e9d69c15/model.safetensors'
HIDDEN = '/layer_norm/LayerNormalization_output_0'  # the input of the phoneme head in model-int8.onnx


def fetch(a, b):
    req = urllib.request.Request(URL, headers={'Range': f'bytes={a}-{b - 1}'})
    with urllib.request.urlopen(req) as r:
        data = r.read()
    assert len(data) == b - a, (a, b, len(data))
    return data


n = struct.unpack('<Q', fetch(0, 8))[0]
header = json.loads(fetch(8, 8 + n))
base = 8 + n


def tensor(name):
    t = header[name]
    assert t['dtype'] == 'F32', t
    a, b = t['data_offsets']
    return np.frombuffer(fetch(base + a, base + b), '<f4').reshape(t['shape']).copy()


weight = tensor('heads.tafkheem_or_taqeeq.weight')  # [4, 512]: blank, mofakham, moraqaq, low_mofakham
bias = tensor('heads.tafkheem_or_taqeeq.bias')      # [4]

graph = onnx.GraphProto()
graph.node.extend([
    helper.make_node('MatMul', [HIDDEN, 'athar.tafkheem.weight'], ['athar.tafkheem.mm'], name='athar.tafkheem.MatMul'),
    helper.make_node('Add', ['athar.tafkheem.mm', 'athar.tafkheem.bias'], ['athar.tafkheem.logits'], name='athar.tafkheem.Add'),
    helper.make_node('LogSoftmax', ['athar.tafkheem.logits'], ['tafkheem'], name='athar.tafkheem.LogSoftmax', axis=-1),
])
graph.initializer.extend([numpy_helper.from_array(weight.T.copy(), 'athar.tafkheem.weight'), numpy_helper.from_array(bias, 'athar.tafkheem.bias')])
graph.output.extend([helper.make_tensor_value_info('tafkheem', TensorProto.FLOAT, ['b', 'f', 4])])
patch = onnx.ModelProto()
patch.graph.CopyFrom(graph)
data = patch.SerializeToString()
open(sys.argv[1], 'wb').write(data)
print('patch bytes', len(data))
