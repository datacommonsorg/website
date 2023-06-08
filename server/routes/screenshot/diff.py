# Copyright 2023 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#      http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import io

from PIL import Image
from PIL import ImageChops
from PIL import ImageOps


# This is inspired by https://github.com/nicolashahn/diffimg/blob/master/diffimg/diff.py
def img_diff(im1, im2):
  """
  Calculate the difference between two images by comparing channel values at the pixel
  level. If the images are different sizes, the second will be resized to match the
  first.
  """
  im1 = Image.open(io.BytesIO(im1))
  im2 = Image.open(io.BytesIO(im2))

  # Ensure we have the same color channels (RGBA vs RGB)
  if im1.mode != im2.mode:
    raise ValueError(
        ("Differing color modes:\n  {}\n  {}\n"
         "Ensure image color modes are the same.").format(im1.mode, im2.mode))

  # Coerce 2nd dimensions to same as 1st
  im2 = im2.resize((im1.width, im1.height))

  # Generate diff image in memory.
  diff_img = ImageChops.difference(im1, im2)

  r, g, b, _ = diff_img.split()
  rgb_image = Image.merge('RGB', (r, g, b))

  num_diff_pixel = sum(
      rgb_image.point(lambda x: 255
                      if x else 0).convert("L").point(bool).getdata())
  diff_ratio = num_diff_pixel / rgb_image.width / rgb_image.height
  return ImageOps.invert(rgb_image), diff_ratio
