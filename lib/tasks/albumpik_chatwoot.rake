namespace :albumpik do
  namespace :chatwoot do
    desc 'Ensure the AlbumPik PlatformApp exists and optionally grant account/user permissions'
    task ensure_platform_app: :environment do
      app_name = ENV.fetch('ALBUMPIK_PLATFORM_APP_NAME', 'AlbumPik Platform App')
      platform_app = PlatformApp.find_or_create_by!(name: app_name)
      platform_app.create_access_token if platform_app.access_token.blank?

      puts "PlatformApp ##{platform_app.id}: #{platform_app.name}"

      permission_sets = {
        'Account' => [ENV['ALBUMPIK_PLATFORM_APP_ACCOUNT_IDS'], Account],
        'User' => [ENV['ALBUMPIK_PLATFORM_APP_USER_IDS'], User]
      }

      permission_sets.each do |label, (raw_ids, model)|
        next if raw_ids.blank?

        ids = raw_ids.split(',').map(&:strip).reject(&:blank?).map(&:to_i).uniq
        existing_ids = model.where(id: ids).pluck(:id)

        model.where(id: existing_ids).find_each do |record|
          PlatformAppPermissible.find_or_create_by!(
            platform_app: platform_app,
            permissible: record
          )
          puts "Granted #{label} ##{record.id}"
        end

        missing_ids = ids - existing_ids
        puts "Missing #{label} IDs: #{missing_ids.join(', ')}" if missing_ids.any?
      end

      studio_attribute_key = ENV.fetch('ALBUMPIK_STUDIO_ATTRIBUTE_KEY', 'albumpik_studio_id')
      puts "Studio mapping attribute key: #{studio_attribute_key}"

      if ActiveModel::Type::Boolean.new.cast(ENV.fetch('PRINT_PLATFORM_APP_TOKEN', false))
        puts "Platform API access token: #{platform_app.access_token.token}"
      else
        puts 'Set PRINT_PLATFORM_APP_TOKEN=true to print the Platform API token to stdout.'
      end
    end
  end
end
