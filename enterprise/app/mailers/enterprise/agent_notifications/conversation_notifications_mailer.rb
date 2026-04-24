module Enterprise::AgentNotifications::ConversationNotificationsMailer
  def sla_missed_first_response(conversation, agent, sla_policy)
    return unless smtp_config_set_or_development?

    set_conversation_mail_variables(conversation, agent)
    @sla_policy = sla_policy
    subject = notification_subject(:sla_missed_first_response)
    set_mail_copy(:sla_missed_first_response)
    send_mail_with_liquid(to: @agent.email, subject: subject) and return
  end

  def sla_missed_next_response(conversation, agent, sla_policy)
    return unless smtp_config_set_or_development?

    set_conversation_mail_variables(conversation, agent)
    @sla_policy = sla_policy
    subject = notification_subject(:sla_missed_next_response)
    set_mail_copy(:sla_missed_next_response)
    send_mail_with_liquid(to: @agent.email, subject: subject) and return
  end

  def sla_missed_resolution(conversation, agent, sla_policy)
    return unless smtp_config_set_or_development?

    set_conversation_mail_variables(conversation, agent)
    @sla_policy = sla_policy
    subject = notification_subject(:sla_missed_resolution)
    set_mail_copy(:sla_missed_resolution)
    send_mail_with_liquid(to: @agent.email, subject: subject) and return
  end

  def liquid_droppables
    super.merge({
                  sla_policy: @sla_policy
                })
  end
end
