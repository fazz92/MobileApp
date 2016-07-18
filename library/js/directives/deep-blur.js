define(
    [
		'vendor/angular-custom' 
    ],

    function(
		angular
    ) {
		'use strict'; 
		
		return angular.module('DeepBlur.directive', [])
			.directive('deepBlur', 
				function( $document, $parse ){
					return {
					
						restrict: 'A',
						
						link: function( $scope, $element, $attributes ){
						
							var scopeExpression = $attributes.deepBlur,
								onDocumentClick = function(event){
									var isChild = $element.find(event.target).length > 0;

									if(!isChild) {
										$scope.$apply(scopeExpression);
									}
								};

							$document.on('click', onDocumentClick);

							$element.on('$destroy', function() {
								$document.off('click', onDocumentClick);
							});
						}
					};
				}
			);
	}
);