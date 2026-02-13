function showMsgAlert(style, message) {
  const alertMessage = $('#alertMessage');
  const alertMessageContent = $('#alertMessageContent');

  alertMessage.toggleClass(style);
  alertMessageContent.text(message);

  alertMessage.addClass('show');
  alertMessage.removeClass('hide');
}

$(document).ready(function () {
  $('#alertDissmiss').on('click', () => {
    $('#alertMessage').removeClass('show');
    $('#alertMessage').addClass('hide');

    $('#alertMessage').removeClass('success');
    $('#alertMessage').removeClass('error');
  });
});
