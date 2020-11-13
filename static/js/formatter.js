exports.format = function (msgs) {
  var results = [];
  for (const [id, msg] of Object.entries(msgs)) {
    results.push({
      inputs: {
        localization_input_id: id,
        source_text: msg.defaultMessage,
        context: {
          description: msg.description,
        },
      },
    });
  }
  return results;
};
