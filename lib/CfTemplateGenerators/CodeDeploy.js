function buildApplication() {
  return {
    Type: 'AWS::CodeDeploy::Application',
    Properties: { ComputePlatform: 'Lambda' }
  };
}

function buildFnDeploymentGroup({ codeDeployAppName, codeDeployRoleArn, deploymentSettings = {} }) {
  let triggerConfigurations;
  if (deploymentSettings.snsTopic) {
    triggerConfigurations = [
      {
        TriggerEvents: [ 'DeploymentStart',
          'DeploymentSuccess',
          'DeploymentFailure',
          'DeploymentStop',
          'DeploymentRollback',
          'DeploymentReady',
          'InstanceStart',
          'InstanceSuccess',
          'InstanceFailure',
          'InstanceReady' ],
        TriggerName: 'all_events',
        TriggerTargetArn : deploymentSettings.snsTopic
      },
    ];
  }
  const deploymentGroup = {
    Type: 'AWS::CodeDeploy::DeploymentGroup',
    Properties: {
      ApplicationName: {
        Ref: codeDeployAppName
      },
      AutoRollbackConfiguration: {
        Enabled: true,
        Events: [
          'DEPLOYMENT_FAILURE',
          'DEPLOYMENT_STOP_ON_ALARM',
          'DEPLOYMENT_STOP_ON_REQUEST'
        ]
      },
      DeploymentConfigName: {
        'Fn::Sub': [
          'CodeDeployDefault.Lambda${ConfigName}',
          { ConfigName: deploymentSettings.type }
        ]
      },
      TriggerConfigurations: triggerConfigurations,
      DeploymentStyle: {
        DeploymentType: 'BLUE_GREEN',
        DeploymentOption: 'WITH_TRAFFIC_CONTROL'
      }
    }
  };
  const lookupRole = { 'Fn::GetAtt': ['CodeDeployServiceRole', 'Arn'] };
  const roleArn = codeDeployRoleArn || lookupRole;
  Object.assign(deploymentGroup.Properties, { ServiceRoleArn: roleArn });
  if (deploymentSettings.alarms) {
    const alarmConfig = {
      Alarms: deploymentSettings.alarms.map(a => ({ Name: { Ref: a } })),
      Enabled: true
    };
    Object.assign(deploymentGroup.Properties, { AlarmConfiguration: alarmConfig });
  }
  return deploymentGroup;
}

const CodeDeploy = {
  buildApplication,
  buildFnDeploymentGroup
};

module.exports = CodeDeploy;
