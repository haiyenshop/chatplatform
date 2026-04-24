class AgentNotifications::ConversationNotificationsMailer < ApplicationMailer
  MAILER_SCOPE = 'mailers.agent_notifications.conversation_notifications'.freeze

  def conversation_creation(conversation, agent, _user)
    return unless smtp_config_set_or_development?

    set_conversation_mail_variables(conversation, agent)
    inbox_name = @conversation.inbox&.sanitized_name
    subject = notification_subject(:conversation_creation, inbox_name: inbox_name)
    set_mail_copy(:conversation_creation)
    send_mail_with_liquid(to: @agent.email, subject: subject) and return
  end

  def conversation_assignment(conversation, agent, _user)
    return unless smtp_config_set_or_development?

    set_conversation_mail_variables(conversation, agent)
    subject = notification_subject(:conversation_assignment)
    set_mail_copy(:conversation_assignment)
    send_mail_with_liquid(to: @agent.email, subject: subject) and return
  end

  def conversation_mention(conversation, agent, message)
    return unless smtp_config_set_or_development?

    set_conversation_mail_variables(conversation, agent)
    @message = message
    subject = notification_subject(:conversation_mention)
    set_mail_copy(:conversation_mention)
    send_mail_with_liquid(to: @agent.email, subject: subject) and return
  end

  def assigned_conversation_new_message(conversation, agent, message)
    return unless smtp_config_set_or_development?
    # Don't spam with email notifications if agent is online
    return if ::OnlineStatusTracker.get_presence(message.account_id, 'User', agent.id)

    set_conversation_mail_variables(conversation, agent)
    @message = message
    subject = notification_subject(:assigned_conversation_new_message)
    set_mail_copy(:assigned_conversation_new_message)
    send_mail_with_liquid(to: @agent.email, subject: subject) and return
  end

  def participating_conversation_new_message(conversation, agent, message)
    return unless smtp_config_set_or_development?
    # Don't spam with email notifications if agent is online
    return if ::OnlineStatusTracker.get_presence(message.account_id, 'User', agent.id)

    set_conversation_mail_variables(conversation, agent)
    @message = message
    subject = notification_subject(:participating_conversation_new_message)
    set_mail_copy(:participating_conversation_new_message)
    send_mail_with_liquid(to: @agent.email, subject: subject) and return
  end

  private

  def set_conversation_mail_variables(conversation, agent)
    @agent = agent
    @conversation = conversation
    @action_url = app_account_conversation_url(account_id: @conversation.account_id, id: @conversation.display_id)
  end

  def notification_subject(key, **options)
    I18n.t("#{MAILER_SCOPE}.subjects.#{key}", **subject_options.merge(options))
  end

  def subject_options
    {
      user_name: @agent.available_name,
      display_id: @conversation.display_id,
      inbox_name: @conversation.inbox&.sanitized_name
    }
  end

  def set_mail_copy(key)
    @mail_copy = common_mail_copy.merge('body' => mail_body(key))
  end

  def common_mail_copy
    {
      'greeting' => I18n.t("#{MAILER_SCOPE}.greeting", name: @agent.available_name),
      'sender_you' => I18n.t("#{MAILER_SCOPE}.sender_you"),
      'attachment' => I18n.t("#{MAILER_SCOPE}.attachment"),
      'attachment_link' => I18n.t("#{MAILER_SCOPE}.attachment_link"),
      'action_html' => I18n.t("#{MAILER_SCOPE}.action_html", action_url: @action_url),
      'view_message' => I18n.t("#{MAILER_SCOPE}.view_message"),
      'previous_messages' => I18n.t("#{MAILER_SCOPE}.previous_messages"),
      'sla_action' => I18n.t("#{MAILER_SCOPE}.sla_action")
    }
  end

  def mail_body(key)
    I18n.t("#{MAILER_SCOPE}.bodies.#{key}", **mail_body_options)
  end

  def mail_body_options
    {
      action_url: @action_url,
      contact_name: @conversation.contact_name,
      display_id: @conversation.display_id,
      inbox_name: @conversation.inbox&.name,
      policy_name: @sla_policy&.name,
      sender_name: @message&.sender_display_name
    }
  end

  def liquid_locals
    super.merge(mail_copy: @mail_copy || {})
  end

  def liquid_droppables
    super.merge({
                  user: @agent,
                  conversation: @conversation,
                  inbox: @conversation.inbox,
                  message: @message
                })
  end
end

AgentNotifications::ConversationNotificationsMailer.prepend_mod_with('AgentNotifications::ConversationNotificationsMailer')
