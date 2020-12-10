#!/bin/bash

env=prod
regions=($(yq r cluster.yaml region.$env.primary))
len=$(yq r cluster.yaml --length region.$env.others)

for ((i=0; i<$len; i++))
do
  region=$(yq r cluster.yaml region.$env.others[$i])
  regions+=( $region )
done

echo $regions