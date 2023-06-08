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

from PIL import Image, ImageChops, ImageStat

import io


# This is inspired by https://github.com/nicolashahn/diffimg/blob/master/diffimg/diff.py
def img_diff(im1, im2, ignore_alpha=False):
  """
    Calculate the difference between two images by comparing channel values at the pixel
    level. If the images are different sizes, the second will be resized to match the
    first.

    `ignore_alpha`: ignore the alpha channel for ratio calculation, and set the diff
        image's alpha to fully opaque
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

  if ignore_alpha:
    diff_img.putalpha(256)

  # Calculate difference as a ratio.
  stat = ImageStat.Stat(diff_img)
  # stat.mean can be [r,g,b] or [r,g,b,a].
  removed_channels = 1 if ignore_alpha and len(stat.mean) == 4 else 0
  num_channels = len(stat.mean) - removed_channels
  sum_channel_values = sum(stat.mean[:num_channels])
  max_all_channels = num_channels * 255
  diff_ratio = sum_channel_values / max_all_channels

  return diff_img, diff_ratio
